import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PurchaseOrderStatus } from '@prisma/client';

import type { AuthUser } from '../../../common/auth/auth.types';
import { PrismaService } from '../../../common/database/prisma.service';
import { newId } from '../../../common/ids/new-id';
import { InventoryService } from '../../inventory/inventory.service';
import { ProductsService } from '../../../products/products.service';
import type { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import type { CreatePurchaseReceiptDto } from './dto/create-purchase-receipt.dto';
import type { ListPurchaseOrdersQueryDto } from './dto/list-purchase-orders.query.dto';

function moneyToString(value: Prisma.Decimal): string {
  return value.toString();
}

export type PurchaseOrderItemView = {
  id: string;
  productId: string | null;
  name: string;
  code: string | null;
  quantityOrdered: number;
  receivedQty: number;
  pendingQty: number;
  agreedUnitCost: string;
  lineTotal: string;
};

export type PurchaseOrderView = {
  id: string;
  tenantId: string;
  branch: { id: string; name: string };
  supplier: { id: string; name: string };
  number: string;
  status: PurchaseOrderStatus;
  expectedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: PurchaseOrderItemView[];
};

export type PurchaseOrderListItemView = {
  id: string;
  number: string;
  status: PurchaseOrderStatus;
  expectedAt: Date | null;
  supplier: { id: string; name: string };
  branch: { id: string; name: string };
  createdAt: Date;
  updatedAt: Date;
};

export type PurchaseOrderListResult = {
  items: PurchaseOrderListItemView[];
  nextCursor: string | null;
};

export type PurchaseReceiptView = {
  id: string;
  number: string;
  status: 'POSTED' | 'VOID';
  receivedAt: Date;
  payableId: string | null;
  items: Array<{
    id: string;
    purchaseOrderItemId: string;
    productId: string | null;
    name: string;
    code: string | null;
    quantityReceived: number;
    actualUnitCost: string;
    lineTotal: string;
  }>;
};

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
    private readonly inventory: InventoryService,
  ) {}

  async create(
    user: AuthUser,
    dto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrderView> {
    await this.requireBranch(user.tenantId, dto.branchId);
    const supplier = await this.requireSupplier(user.tenantId, dto.supplierId);
    if (!supplier.isActive) {
      throw new BadRequestException('Supplier is inactive');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('items cannot be empty');
    }

    const expectedAt = dto.expectedAt ? new Date(dto.expectedAt) : null;
    const notesRaw = dto.notes?.trim();
    const notes = notesRaw && notesRaw.length > 0 ? notesRaw : null;

    const created = await this.prisma.$transaction(async (tx) => {
      const poId = newId();
      const number = newId();

      const itemsData: Array<{
        id: string;
        tenantId: string;
        productId: string | null;
        nameSnapshot: string;
        codeSnapshot: string | null;
        quantityOrdered: number;
        agreedUnitCost: Prisma.Decimal;
        lineTotal: Prisma.Decimal;
      }> = [];

      for (const [idx, item] of dto.items.entries()) {
        const hasProductId = typeof item.productId === 'string';
        const hasNewProduct = item.newProduct !== undefined;
        if (hasProductId === hasNewProduct) {
          throw new BadRequestException(
            `items[${idx}] must include exactly one of productId or newProduct`,
          );
        }

        const product = hasNewProduct
          ? await this.products.create(
              user.tenantId,
              (() => {
                const np = item.newProduct;
                if (!np) throw new Error('newProduct is missing');
                return {
                  code: np.code,
                  name: np.name,
                  categoryId: np.categoryId,
                  description: np.description,
                  isActive: np.isActive,
                  attributes: np.attributes,
                };
              })(),
              tx,
            )
          : await tx.product.findFirst({
              where: {
                tenantId: user.tenantId,
                id: item.productId,
                isActive: true,
              },
              select: { id: true, name: true, code: true },
            });
        if (!product) {
          throw new BadRequestException(`items[${idx}].productId is invalid`);
        }

        const agreedUnitCost = new Prisma.Decimal(item.agreedUnitCost);
        const lineTotal = agreedUnitCost
          .mul(item.quantityOrdered)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

        itemsData.push({
          id: newId(),
          tenantId: user.tenantId,
          productId: product.id,
          nameSnapshot: product.name,
          codeSnapshot: product.code,
          quantityOrdered: item.quantityOrdered,
          agreedUnitCost,
          lineTotal,
        });
      }

      await tx.purchaseOrder.create({
        data: {
          id: poId,
          tenantId: user.tenantId,
          branchId: dto.branchId,
          supplierId: dto.supplierId,
          number,
          status: PurchaseOrderStatus.DRAFT,
          expectedAt,
          notes,
          createdByMembershipId: user.membershipId,
          items: { create: itemsData },
        },
        select: { id: true },
      });

      return poId;
    });

    return this.getById(user, created);
  }

  async list(
    user: AuthUser,
    query: ListPurchaseOrdersQueryDto,
  ): Promise<PurchaseOrderListResult> {
    const limit = query.limit ?? 50;
    const take = limit + 1;

    const where: Prisma.PurchaseOrderWhereInput = {
      tenantId: user.tenantId,
    };
    if (query.cursor) where.id = { lt: query.cursor };
    if (query.branchId) where.branchId = query.branchId;
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.status) where.status = query.status;
    const q = query.q?.trim();
    if (q) {
      where.OR = [
        { number: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.purchaseOrder.findMany({
      where,
      orderBy: { id: 'desc' },
      take,
      select: {
        id: true,
        number: true,
        status: true,
        expectedAt: true,
        createdAt: true,
        updatedAt: true,
        supplier: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

    return {
      items: items.map((row) => ({
        id: row.id,
        number: row.number,
        status: row.status,
        expectedAt: row.expectedAt,
        supplier: row.supplier,
        branch: row.branch,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
      nextCursor,
    };
  }

  async getById(user: AuthUser, id: string): Promise<PurchaseOrderView> {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { tenantId: user.tenantId, id },
      select: {
        id: true,
        tenantId: true,
        branch: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        number: true,
        status: true,
        expectedAt: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        items: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            productId: true,
            nameSnapshot: true,
            codeSnapshot: true,
            quantityOrdered: true,
            receivedQty: true,
            agreedUnitCost: true,
            lineTotal: true,
          },
        },
      },
    });
    if (!po) throw new NotFoundException('Purchase order not found');

    const items: PurchaseOrderItemView[] = po.items.map((i) => {
      const pendingQty = i.quantityOrdered - i.receivedQty;
      return {
        id: i.id,
        productId: i.productId,
        name: i.nameSnapshot,
        code: i.codeSnapshot,
        quantityOrdered: i.quantityOrdered,
        receivedQty: i.receivedQty,
        pendingQty: pendingQty < 0 ? 0 : pendingQty,
        agreedUnitCost: moneyToString(i.agreedUnitCost),
        lineTotal: moneyToString(i.lineTotal),
      };
    });

    return {
      id: po.id,
      tenantId: po.tenantId,
      branch: po.branch,
      supplier: po.supplier,
      number: po.number,
      status: po.status,
      expectedAt: po.expectedAt,
      notes: po.notes,
      createdAt: po.createdAt,
      updatedAt: po.updatedAt,
      items,
    };
  }

  async confirm(user: AuthUser, id: string): Promise<PurchaseOrderView> {
    const updated = await this.prisma.purchaseOrder.updateMany({
      where: { tenantId: user.tenantId, id, status: PurchaseOrderStatus.DRAFT },
      data: { status: PurchaseOrderStatus.CONFIRMED },
    });
    if (updated.count === 0) {
      const existing = await this.prisma.purchaseOrder.findFirst({
        where: { tenantId: user.tenantId, id },
        select: { id: true, status: true },
      });
      if (!existing) throw new NotFoundException('Purchase order not found');
      throw new ConflictException('Purchase order cannot be confirmed');
    }
    return this.getById(user, id);
  }

  async cancel(user: AuthUser, id: string): Promise<PurchaseOrderView> {
    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findFirst({
        where: { tenantId: user.tenantId, id },
        select: { id: true, status: true },
      });
      if (!po) throw new NotFoundException('Purchase order not found');
      if (po.status === PurchaseOrderStatus.CANCELLED)
        return this.getById(user, id);
      if (po.status === PurchaseOrderStatus.COMPLETED) {
        throw new ConflictException('Purchase order is completed');
      }
      const receivedCount = await tx.purchaseOrderItem.count({
        where: {
          tenantId: user.tenantId,
          purchaseOrderId: id,
          receivedQty: { gt: 0 },
        },
      });
      if (receivedCount > 0) {
        throw new ConflictException(
          'Cannot cancel a purchase order with receipts',
        );
      }
      await tx.purchaseOrder.update({
        where: { id },
        data: { status: PurchaseOrderStatus.CANCELLED },
        select: { id: true },
      });
      return this.getById(user, id);
    });
  }

  async receive(
    user: AuthUser,
    purchaseOrderId: string,
    dto: CreatePurchaseReceiptDto,
  ): Promise<{
    receipt: PurchaseReceiptView;
    purchaseOrder: PurchaseOrderView;
  }> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('items cannot be empty');
    }

    const receivedAt = new Date(dto.receivedAt);
    const notesRaw = dto.notes?.trim();
    const notes = notesRaw && notesRaw.length > 0 ? notesRaw : null;
    const payableId = dto.payableId ?? null;

    const { receiptId } = await this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findFirst({
        where: { tenantId: user.tenantId, id: purchaseOrderId },
        select: {
          id: true,
          branchId: true,
          supplierId: true,
          status: true,
        },
      });
      if (!po) throw new NotFoundException('Purchase order not found');
      if (po.status === PurchaseOrderStatus.DRAFT) {
        throw new ConflictException('Purchase order must be confirmed first');
      }
      if (po.status === PurchaseOrderStatus.CANCELLED) {
        throw new ConflictException('Purchase order is cancelled');
      }
      if (po.status === PurchaseOrderStatus.COMPLETED) {
        throw new ConflictException('Purchase order is completed');
      }

      const uniqueIds = [
        ...new Set(dto.items.map((i) => i.purchaseOrderItemId)),
      ];
      if (uniqueIds.length !== dto.items.length) {
        throw new BadRequestException('Duplicate purchaseOrderItemId in items');
      }

      const poItems = await tx.purchaseOrderItem.findMany({
        where: {
          tenantId: user.tenantId,
          purchaseOrderId: po.id,
          id: { in: uniqueIds },
        },
        select: {
          id: true,
          productId: true,
          nameSnapshot: true,
          codeSnapshot: true,
          quantityOrdered: true,
          receivedQty: true,
        },
      });
      const byId = new Map(poItems.map((i) => [i.id, i]));

      for (const [idx, item] of dto.items.entries()) {
        const poItem = byId.get(item.purchaseOrderItemId);
        if (!poItem) {
          throw new BadRequestException(
            `items[${idx}].purchaseOrderItemId is invalid`,
          );
        }
        if (!poItem.productId) {
          throw new ConflictException(
            `items[${idx}] cannot be received because productId is missing`,
          );
        }
        const pendingQty = poItem.quantityOrdered - poItem.receivedQty;
        if (pendingQty <= 0) {
          throw new ConflictException(
            `items[${idx}] is already fully received`,
          );
        }
        if (item.quantityReceived > pendingQty) {
          throw new BadRequestException(
            `items[${idx}].quantityReceived exceeds pending quantity`,
          );
        }
      }

      const receiptId = newId();
      const receiptNumber = newId();

      await tx.purchaseReceipt.create({
        data: {
          id: receiptId,
          tenantId: user.tenantId,
          branchId: po.branchId,
          supplierId: po.supplierId,
          purchaseOrderId: po.id,
          number: receiptNumber,
          status: 'POSTED',
          receivedAt,
          notes,
          payableId,
          createdByMembershipId: user.membershipId,
        },
        select: { id: true },
      });

      for (const item of dto.items) {
        const poItem = byId.get(item.purchaseOrderItemId);
        if (!poItem || !poItem.productId) {
          throw new Error('Receipt item validation mismatch');
        }

        const actualUnitCost = new Prisma.Decimal(item.actualUnitCost);
        const lineTotal = actualUnitCost
          .mul(item.quantityReceived)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

        await tx.purchaseReceiptItem.create({
          data: {
            id: newId(),
            tenantId: user.tenantId,
            purchaseReceiptId: receiptId,
            purchaseOrderItemId: poItem.id,
            productId: poItem.productId,
            nameSnapshot: poItem.nameSnapshot,
            codeSnapshot: poItem.codeSnapshot,
            quantityReceived: item.quantityReceived,
            actualUnitCost,
            lineTotal,
          },
          select: { id: true },
        });

        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { receivedQty: { increment: item.quantityReceived } },
          select: { id: true },
        });

        await this.inventory.receivePurchaseLine(
          user.tenantId,
          po.branchId,
          poItem.productId,
          item.quantityReceived,
          item.actualUnitCost,
          receiptId,
          user.userId,
          tx,
        );
      }

      const allItems = await tx.purchaseOrderItem.findMany({
        where: { tenantId: user.tenantId, purchaseOrderId: po.id },
        select: { quantityOrdered: true, receivedQty: true },
      });
      const isCompleted = allItems.every(
        (i) => i.quantityOrdered - i.receivedQty <= 0,
      );
      if (isCompleted) {
        await tx.purchaseOrder.update({
          where: { id: po.id },
          data: { status: PurchaseOrderStatus.COMPLETED },
          select: { id: true },
        });
      } else if (po.status === PurchaseOrderStatus.CONFIRMED) {
        await tx.purchaseOrder.update({
          where: { id: po.id },
          data: { status: PurchaseOrderStatus.PARTIALLY_RECEIVED },
          select: { id: true },
        });
      }

      return { receiptId };
    });

    const [receipt, purchaseOrder] = await Promise.all([
      this.getReceipt(user, receiptId),
      this.getById(user, purchaseOrderId),
    ]);

    return { receipt, purchaseOrder };
  }

  async getReceipt(
    user: AuthUser,
    receiptId: string,
  ): Promise<PurchaseReceiptView> {
    const receipt = await this.prisma.purchaseReceipt.findFirst({
      where: { tenantId: user.tenantId, id: receiptId },
      select: {
        id: true,
        number: true,
        status: true,
        receivedAt: true,
        payableId: true,
        items: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            purchaseOrderItemId: true,
            productId: true,
            nameSnapshot: true,
            codeSnapshot: true,
            quantityReceived: true,
            actualUnitCost: true,
            lineTotal: true,
          },
        },
      },
    });
    if (!receipt) throw new NotFoundException('Purchase receipt not found');

    return {
      id: receipt.id,
      number: receipt.number,
      status: receipt.status,
      receivedAt: receipt.receivedAt,
      payableId: receipt.payableId,
      items: receipt.items.map((i) => ({
        id: i.id,
        purchaseOrderItemId: i.purchaseOrderItemId,
        productId: i.productId,
        name: i.nameSnapshot,
        code: i.codeSnapshot,
        quantityReceived: i.quantityReceived,
        actualUnitCost: moneyToString(i.actualUnitCost),
        lineTotal: moneyToString(i.lineTotal),
      })),
    };
  }

  private async requireBranch(
    tenantId: string,
    branchId: string,
  ): Promise<void> {
    const branch = await this.prisma.branch.findFirst({
      where: { tenantId, id: branchId },
      select: { id: true },
    });
    if (!branch) throw new BadRequestException('Invalid branchId');
  }

  private async requireSupplier(
    tenantId: string,
    supplierId: string,
  ): Promise<{ id: string; isActive: boolean }> {
    const supplier = await this.prisma.supplier.findFirst({
      where: { tenantId, id: supplierId },
      select: { id: true, isActive: true },
    });
    if (!supplier) throw new BadRequestException('Invalid supplierId');
    return supplier;
  }
}
