import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';

import { PrismaService } from '../../common/database/prisma.service';
import { newId } from '../../common/ids/new-id';
import type { ListBranchInventoryQueryDto } from './dto/list-branch-inventory.query.dto';

type DbClient = Prisma.TransactionClient | PrismaService;

function moneyToString(value: Prisma.Decimal | null): string | null {
  return value ? value.toString() : null;
}

export type BranchInventoryItemView = {
  id: string;
  branchId: string;
  product: { id: string; code: string; name: string };
  stockOnHand: number;
  price: string | null;
};

export type BranchInventoryListResult = {
  items: BranchInventoryItemView[];
  nextCursor: string | null;
};

export type ProductStockResult = {
  productId: string;
  branches: Array<{
    branch: { id: string; name: string };
    stockOnHand: number;
    price: string | null;
  }>;
};

export type StockAdjustmentResult = {
  branchId: string;
  productId: string;
  stockOnHand: number;
  movementId: string;
};

export type StockTransferResult = {
  fromBranchId: string;
  toBranchId: string;
  productId: string;
  quantity: number;
  referenceId: string;
};

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async initializeStock(
    tenantId: string,
    branchId: string,
    productId: string,
    stockOnHand: number,
    price: number,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (!Number.isInteger(stockOnHand) || stockOnHand < 0) {
      throw new BadRequestException('stockOnHand must be an integer >= 0');
    }
    if (!Number.isFinite(price) || price < 0) {
      throw new BadRequestException('price must be a number >= 0');
    }

    const client: DbClient = tx ?? this.prisma;
    await this.requireBranch(client, tenantId, branchId);
    await this.requireProduct(client, tenantId, productId);

    const where = {
      tenantId_branchId_productId: { tenantId, branchId, productId },
    };

    const existing = await client.branchInventory.findUnique({
      where,
      select: { id: true, stockOnHand: true },
    });
    const quantityBefore = existing?.stockOnHand ?? 0;

    const priceDecimal = new Prisma.Decimal(price);
    const upserted = await client.branchInventory.upsert({
      where,
      update: {
        stockOnHand,
        price: priceDecimal,
      },
      create: {
        id: newId(),
        tenantId,
        branchId,
        productId,
        stockOnHand,
        price: priceDecimal,
      },
      select: { id: true, stockOnHand: true },
    });

    const quantityAfter = upserted.stockOnHand;
    const delta = quantityAfter - quantityBefore;

    await client.stockMovement.create({
      data: {
        id: newId(),
        tenantId,
        branchId,
        productId,
        type: StockMovementType.PURCHASE_RECEIPT,
        quantity: delta,
        quantityBefore,
        quantityAfter,
        referenceType: 'INITIAL_STOCK',
      },
      select: { id: true },
    });
  }

  async adjustStock(
    tenantId: string,
    branchId: string,
    productId: string,
    quantity: number,
    notes: string | null,
    userId: string,
  ): Promise<StockAdjustmentResult> {
    if (!Number.isInteger(quantity) || quantity === 0) {
      throw new BadRequestException('quantity must be a non-zero integer');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.requireBranch(tx, tenantId, branchId);
      await this.requireProduct(tx, tenantId, productId);

      const whereUnique = {
        tenantId_branchId_productId: { tenantId, branchId, productId },
      };

      const existing = await tx.branchInventory.findUnique({
        where: whereUnique,
        select: { id: true, stockOnHand: true },
      });

      const quantityBefore = existing?.stockOnHand ?? 0;

      if (quantity > 0) {
        if (!existing) {
          await tx.branchInventory.create({
            data: {
              id: newId(),
              tenantId,
              branchId,
              productId,
              stockOnHand: 0,
            },
            select: { id: true },
          });
        }

        await tx.branchInventory.updateMany({
          where: { tenantId, branchId, productId },
          data: { stockOnHand: { increment: quantity } },
        });
      } else {
        const decrementBy = -quantity;
        const updated = await tx.branchInventory.updateMany({
          where: {
            tenantId,
            branchId,
            productId,
            stockOnHand: { gte: decrementBy },
          },
          data: { stockOnHand: { decrement: decrementBy } },
        });
        if (updated.count === 0) {
          throw new BadRequestException('Insufficient stock');
        }
      }

      const afterRow = await tx.branchInventory.findUnique({
        where: whereUnique,
        select: { stockOnHand: true },
      });
      const quantityAfter = afterRow?.stockOnHand ?? 0;

      const movement = await tx.stockMovement.create({
        data: {
          id: newId(),
          tenantId,
          branchId,
          productId,
          type: StockMovementType.ADJUSTMENT,
          quantity,
          quantityBefore,
          quantityAfter,
          note: notes,
          createdBy: userId,
        },
        select: { id: true },
      });

      return {
        branchId,
        productId,
        stockOnHand: quantityAfter,
        movementId: movement.id,
      };
    });
  }

  async transfer(
    tenantId: string,
    fromBranchId: string,
    toBranchId: string,
    productId: string,
    quantity: number,
    userId: string,
    notes?: string | null,
  ): Promise<StockTransferResult> {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('quantity must be an integer >= 1');
    }
    if (fromBranchId === toBranchId) {
      throw new BadRequestException('fromBranchId and toBranchId must differ');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.requireBranch(tx, tenantId, fromBranchId);
      await this.requireBranch(tx, tenantId, toBranchId);
      await this.requireProduct(tx, tenantId, productId);

      const fromWhereUnique = {
        tenantId_branchId_productId: {
          tenantId,
          branchId: fromBranchId,
          productId,
        },
      };
      const toWhereUnique = {
        tenantId_branchId_productId: {
          tenantId,
          branchId: toBranchId,
          productId,
        },
      };

      const fromBefore = await tx.branchInventory.findUnique({
        where: fromWhereUnique,
        select: { stockOnHand: true },
      });
      const toBefore = await tx.branchInventory.findUnique({
        where: toWhereUnique,
        select: { stockOnHand: true },
      });

      const quantityBeforeFrom = fromBefore?.stockOnHand ?? 0;
      const quantityBeforeTo = toBefore?.stockOnHand ?? 0;

      await tx.branchInventory.upsert({
        where: toWhereUnique,
        update: {},
        create: {
          id: newId(),
          tenantId,
          branchId: toBranchId,
          productId,
          stockOnHand: 0,
        },
        select: { id: true },
      });

      const updatedFrom = await tx.branchInventory.updateMany({
        where: {
          tenantId,
          branchId: fromBranchId,
          productId,
          stockOnHand: { gte: quantity },
        },
        data: { stockOnHand: { decrement: quantity } },
      });
      if (updatedFrom.count === 0) {
        throw new BadRequestException('Insufficient stock');
      }

      await tx.branchInventory.updateMany({
        where: { tenantId, branchId: toBranchId, productId },
        data: { stockOnHand: { increment: quantity } },
      });

      const fromAfter = await tx.branchInventory.findUnique({
        where: fromWhereUnique,
        select: { stockOnHand: true },
      });
      const toAfter = await tx.branchInventory.findUnique({
        where: toWhereUnique,
        select: { stockOnHand: true },
      });

      const quantityAfterFrom = fromAfter?.stockOnHand ?? 0;
      const quantityAfterTo = toAfter?.stockOnHand ?? 0;

      const referenceId = newId();

      await tx.stockMovement.create({
        data: {
          id: newId(),
          tenantId,
          branchId: fromBranchId,
          productId,
          type: StockMovementType.TRANSFER_OUT,
          quantity: -quantity,
          quantityBefore: quantityBeforeFrom,
          quantityAfter: quantityAfterFrom,
          referenceId,
          referenceType: 'TRANSFER',
          note: notes ?? null,
          createdBy: userId,
        },
        select: { id: true },
      });

      await tx.stockMovement.create({
        data: {
          id: newId(),
          tenantId,
          branchId: toBranchId,
          productId,
          type: StockMovementType.TRANSFER_IN,
          quantity,
          quantityBefore: quantityBeforeTo,
          quantityAfter: quantityAfterTo,
          referenceId,
          referenceType: 'TRANSFER',
          note: notes ?? null,
          createdBy: userId,
        },
        select: { id: true },
      });

      return {
        fromBranchId,
        toBranchId,
        productId,
        quantity,
        referenceId,
      };
    });
  }

  async getStockByBranch(
    tenantId: string,
    branchId: string,
    query: ListBranchInventoryQueryDto,
  ): Promise<BranchInventoryListResult> {
    await this.requireBranch(this.prisma, tenantId, branchId);

    const limit = query.limit ?? 50;
    const take = limit + 1;

    const where: Prisma.BranchInventoryWhereInput = {
      tenantId,
      branchId,
    };
    if (query.cursor) {
      where.id = { lt: query.cursor };
    }

    const rows = await this.prisma.branchInventory.findMany({
      where,
      orderBy: { id: 'desc' },
      take,
      select: {
        id: true,
        branchId: true,
        productId: true,
        stockOnHand: true,
        price: true,
        product: { select: { id: true, code: true, name: true } },
      },
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

    return {
      items: items.map((row) => ({
        id: row.id,
        branchId: row.branchId,
        product: row.product,
        stockOnHand: row.stockOnHand,
        price: moneyToString(row.price),
      })),
      nextCursor,
    };
  }

  async getStockByProduct(
    tenantId: string,
    productId: string,
  ): Promise<ProductStockResult> {
    await this.requireProduct(this.prisma, tenantId, productId);

    const rows = await this.prisma.branchInventory.findMany({
      where: { tenantId, productId },
      orderBy: { branchId: 'asc' },
      select: {
        branch: { select: { id: true, name: true } },
        stockOnHand: true,
        price: true,
      },
    });

    return {
      productId,
      branches: rows.map((row) => ({
        branch: row.branch,
        stockOnHand: row.stockOnHand,
        price: moneyToString(row.price),
      })),
    };
  }

  private async requireBranch(
    client: DbClient,
    tenantId: string,
    branchId: string,
  ): Promise<void> {
    const branch = await client.branch.findFirst({
      where: { id: branchId, tenantId },
      select: { id: true },
    });
    if (!branch) throw new BadRequestException('Invalid branchId');
  }

  private async requireProduct(
    client: DbClient,
    tenantId: string,
    productId: string,
  ): Promise<void> {
    const product = await client.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true },
    });
    if (!product) throw new BadRequestException('Invalid productId');
  }
}
