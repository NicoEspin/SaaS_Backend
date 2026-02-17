import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';

import type { AuthUser } from '../../../common/auth/auth.types';
import { PrismaService } from '../../../common/database/prisma.service';
import { newId } from '../../../common/ids/new-id';
import type { AddCartItemDto } from './dto/add-cart-item.dto';
import type { CheckoutCartDto } from './dto/checkout-cart.dto';
import type { CreateCartDto } from './dto/create-cart.dto';
import type { SetCartItemQuantityDto } from './dto/set-cart-item-quantity.dto';

export type CartItemView = {
  productId: string;
  name: string;
  code: string | null;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export type CartView = {
  id: string;
  tenantId: string;
  branchId: string;
  customerId: string | null;
  status: OrderStatus;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
  createdAt: Date;
  updatedAt: Date;
  items: CartItemView[];
};

export type CheckoutResultView = {
  cart: CartView;
  invoice: {
    id: string;
    number: string;
    status: 'ISSUED' | 'DRAFT';
    issuedAt: Date | null;
    total: string;
  };
};

function moneyToString(value: Prisma.Decimal): string {
  return value.toString();
}

function sumMoney(values: Prisma.Decimal[]): Prisma.Decimal {
  return values.reduce((acc, v) => acc.plus(v), new Prisma.Decimal(0));
}

@Injectable()
export class CartsService {
  constructor(private readonly prisma: PrismaService) {}

  async createCart(
    user: AuthUser,
    branchId: string,
    dto: CreateCartDto,
  ): Promise<CartView> {
    await this.requireBranch(user.tenantId, branchId);
    if (dto.customerId) {
      await this.requireCustomer(user.tenantId, dto.customerId);
    }

    const cart = await this.prisma.order.create({
      data: {
        id: newId(),
        tenantId: user.tenantId,
        branchId,
        number: newId(),
        status: OrderStatus.DRAFT,
        customerId: dto.customerId ?? null,
      },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        customerId: true,
        status: true,
        subtotal: true,
        discountTotal: true,
        taxTotal: true,
        total: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...cart,
      subtotal: moneyToString(cart.subtotal),
      discountTotal: moneyToString(cart.discountTotal),
      taxTotal: moneyToString(cart.taxTotal),
      total: moneyToString(cart.total),
      items: [],
    };
  }

  async getCart(
    user: AuthUser,
    branchId: string,
    cartId: string,
  ): Promise<CartView> {
    const cart = await this.prisma.order.findFirst({
      where: { id: cartId, tenantId: user.tenantId, branchId },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        customerId: true,
        status: true,
        subtotal: true,
        discountTotal: true,
        taxTotal: true,
        total: true,
        createdAt: true,
        updatedAt: true,
        items: {
          orderBy: { createdAt: 'asc' },
          select: {
            productId: true,
            nameSnapshot: true,
            codeSnapshot: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
          },
        },
      },
    });

    if (!cart) throw new NotFoundException('Cart not found');

    return {
      id: cart.id,
      tenantId: cart.tenantId,
      branchId: cart.branchId,
      customerId: cart.customerId,
      status: cart.status,
      subtotal: moneyToString(cart.subtotal),
      discountTotal: moneyToString(cart.discountTotal),
      taxTotal: moneyToString(cart.taxTotal),
      total: moneyToString(cart.total),
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      items: cart.items
        .filter(
          (x): x is typeof x & { productId: string } =>
            typeof x.productId === 'string',
        )
        .map((i) => ({
          productId: i.productId,
          name: i.nameSnapshot,
          code: i.codeSnapshot,
          quantity: i.quantity,
          unitPrice: moneyToString(i.unitPrice),
          lineTotal: moneyToString(i.lineTotal),
        })),
    };
  }

  async addItem(
    user: AuthUser,
    branchId: string,
    cartId: string,
    dto: AddCartItemDto,
  ): Promise<CartView> {
    await this.requireBranch(user.tenantId, branchId);

    await this.requireProduct(user.tenantId, dto.productId);
    const inventory = await this.prisma.branchInventory.findFirst({
      where: { tenantId: user.tenantId, branchId, productId: dto.productId },
      select: { id: true, price: true },
    });
    if (!inventory)
      throw new BadRequestException('Product not available in this branch');
    if (inventory.price === null)
      throw new BadRequestException('Product has no price in this branch');

    const unitPrice = inventory.price;

    await this.prisma.$transaction(async (tx) => {
      const cart = await tx.order.findFirst({
        where: { id: cartId, tenantId: user.tenantId, branchId },
        select: { id: true, status: true },
      });
      if (!cart) throw new NotFoundException('Cart not found');
      if (cart.status !== OrderStatus.DRAFT) {
        throw new ConflictException('Cart is not editable');
      }

      const product = await tx.product.findFirst({
        where: { id: dto.productId, tenantId: user.tenantId, isActive: true },
        select: { id: true, name: true, code: true },
      });
      if (!product) throw new BadRequestException('Invalid productId');

      const existing = await tx.orderItem.findFirst({
        where: {
          tenantId: user.tenantId,
          orderId: cartId,
          productId: dto.productId,
        },
        select: { id: true, quantity: true },
      });

      const newQuantity = (existing?.quantity ?? 0) + dto.quantity;
      const lineTotal = unitPrice.mul(newQuantity);

      if (existing) {
        await tx.orderItem.update({
          where: { id: existing.id },
          data: {
            quantity: newQuantity,
            unitPrice,
            lineTotal,
          },
        });
      } else {
        await tx.orderItem.create({
          data: {
            id: newId(),
            tenantId: user.tenantId,
            orderId: cartId,
            productId: product.id,
            nameSnapshot: product.name,
            codeSnapshot: product.code,
            quantity: newQuantity,
            unitPrice,
            lineTotal,
          },
          select: { id: true },
        });
      }

      await this.recalculateCartTotals(tx, user.tenantId, cartId);
    });

    return this.getCart(user, branchId, cartId);
  }

  async setItemQuantity(
    user: AuthUser,
    branchId: string,
    cartId: string,
    productId: string,
    dto: SetCartItemQuantityDto,
  ): Promise<CartView> {
    await this.requireBranch(user.tenantId, branchId);

    await this.prisma.$transaction(async (tx) => {
      const cart = await tx.order.findFirst({
        where: { id: cartId, tenantId: user.tenantId, branchId },
        select: { id: true, status: true },
      });
      if (!cart) throw new NotFoundException('Cart not found');
      if (cart.status !== OrderStatus.DRAFT) {
        throw new ConflictException('Cart is not editable');
      }

      if (dto.quantity === 0) {
        await tx.orderItem.deleteMany({
          where: { tenantId: user.tenantId, orderId: cartId, productId },
        });
        await this.recalculateCartTotals(tx, user.tenantId, cartId);
        return;
      }

      const inventory = await tx.branchInventory.findFirst({
        where: { tenantId: user.tenantId, branchId, productId },
        select: { price: true },
      });
      if (!inventory)
        throw new BadRequestException('Product not available in this branch');
      if (inventory.price === null)
        throw new BadRequestException('Product has no price in this branch');

      const existing = await tx.orderItem.findFirst({
        where: { tenantId: user.tenantId, orderId: cartId, productId },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException('Cart item not found');

      const unitPrice = inventory.price;
      const lineTotal = unitPrice.mul(dto.quantity);
      await tx.orderItem.update({
        where: { id: existing.id },
        data: {
          quantity: dto.quantity,
          unitPrice,
          lineTotal,
        },
      });

      await this.recalculateCartTotals(tx, user.tenantId, cartId);
    });

    return this.getCart(user, branchId, cartId);
  }

  async removeItem(
    user: AuthUser,
    branchId: string,
    cartId: string,
    productId: string,
  ): Promise<CartView> {
    await this.requireBranch(user.tenantId, branchId);

    await this.prisma.$transaction(async (tx) => {
      const cart = await tx.order.findFirst({
        where: { id: cartId, tenantId: user.tenantId, branchId },
        select: { id: true, status: true },
      });
      if (!cart) throw new NotFoundException('Cart not found');
      if (cart.status !== OrderStatus.DRAFT) {
        throw new ConflictException('Cart is not editable');
      }

      await tx.orderItem.deleteMany({
        where: { tenantId: user.tenantId, orderId: cartId, productId },
      });

      await this.recalculateCartTotals(tx, user.tenantId, cartId);
    });

    return this.getCart(user, branchId, cartId);
  }

  async checkout(
    user: AuthUser,
    branchId: string,
    cartId: string,
    dto: CheckoutCartDto,
  ): Promise<CheckoutResultView> {
    await this.requireBranch(user.tenantId, branchId);
    if (dto.customerId) {
      await this.requireCustomer(user.tenantId, dto.customerId);
    }

    const { invoiceId, invoiceNumber, issuedAt } =
      await this.prisma.$transaction(async (tx) => {
        const locked = await tx.order.updateMany({
          where: {
            id: cartId,
            tenantId: user.tenantId,
            branchId,
            status: OrderStatus.DRAFT,
          },
          data: {
            status: OrderStatus.PENDING,
            customerId: dto.customerId ?? undefined,
          },
        });
        if (locked.count === 0) {
          throw new ConflictException('Cart is not available for checkout');
        }

        const cart = await tx.order.findFirst({
          where: { id: cartId, tenantId: user.tenantId, branchId },
          select: {
            id: true,
            tenantId: true,
            branchId: true,
            customerId: true,
            subtotal: true,
            discountTotal: true,
            taxTotal: true,
            total: true,
            items: {
              select: {
                productId: true,
                nameSnapshot: true,
                codeSnapshot: true,
                quantity: true,
                unitPrice: true,
                lineTotal: true,
              },
            },
          },
        });
        if (!cart) throw new NotFoundException('Cart not found');
        if (cart.items.length === 0)
          throw new BadRequestException('Cart is empty');

        const productItems = cart.items.filter(
          (x): x is typeof x & { productId: string } =>
            typeof x.productId === 'string',
        );
        if (productItems.length !== cart.items.length) {
          throw new BadRequestException('Cart has invalid items');
        }

        // Recalculate totals from items to avoid stale totals.
        const subtotal = sumMoney(productItems.map((i) => i.lineTotal));
        const discountTotal = new Prisma.Decimal(0);
        const taxTotal = new Prisma.Decimal(0);
        const total = subtotal.minus(discountTotal).plus(taxTotal);

        await tx.order.update({
          where: { id: cartId },
          data: { subtotal, discountTotal, taxTotal, total },
          select: { id: true },
        });

        // Stock decrement (branch inventory) with gte guard.
        for (const item of productItems) {
          const updated = await tx.branchInventory.updateMany({
            where: {
              tenantId: user.tenantId,
              branchId,
              productId: item.productId,
              stockOnHand: { gte: item.quantity },
            },
            data: { stockOnHand: { decrement: item.quantity } },
          });
          if (updated.count === 0) {
            throw new ConflictException('Insufficient stock');
          }
        }

        const invoiceId = newId();
        const invoiceNumber = newId();
        const issuedAt = new Date();
        await tx.invoice.create({
          data: {
            id: invoiceId,
            tenantId: user.tenantId,
            branchId,
            orderId: cartId,
            customerId: cart.customerId,
            number: invoiceNumber,
            status: 'ISSUED',
            issuedAt,
            subtotal,
            taxTotal,
            total,
            lines: {
              create: productItems.map((i) => ({
                id: newId(),
                tenantId: user.tenantId,
                productId: i.productId,
                description: i.nameSnapshot,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                lineTotal: i.lineTotal,
              })),
            },
          },
          select: { id: true },
        });

        await tx.order.update({
          where: { id: cartId },
          data: { status: OrderStatus.CONFIRMED },
          select: { id: true },
        });

        return { invoiceId, invoiceNumber, issuedAt };
      });

    const cart = await this.getCart(user, branchId, cartId);
    return {
      cart,
      invoice: {
        id: invoiceId,
        number: invoiceNumber,
        status: 'ISSUED',
        issuedAt,
        total: cart.total,
      },
    };
  }

  private async requireBranch(
    tenantId: string,
    branchId: string,
  ): Promise<void> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId },
      select: { id: true },
    });
    if (!branch) throw new NotFoundException('Branch not found');
  }

  private async requireProduct(
    tenantId: string,
    productId: string,
  ): Promise<void> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId, isActive: true },
      select: { id: true },
    });
    if (!product) throw new BadRequestException('Invalid productId');
  }

  private async requireCustomer(
    tenantId: string,
    customerId: string,
  ): Promise<void> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { id: true },
    });
    if (!customer) throw new BadRequestException('Invalid customerId');
  }

  private async recalculateCartTotals(
    tx: Prisma.TransactionClient,
    tenantId: string,
    cartId: string,
  ): Promise<void> {
    const items = await tx.orderItem.findMany({
      where: { tenantId, orderId: cartId },
      select: { lineTotal: true },
    });
    const subtotal = sumMoney(items.map((i) => i.lineTotal));
    const discountTotal = new Prisma.Decimal(0);
    const taxTotal = new Prisma.Decimal(0);
    const total = subtotal.minus(discountTotal).plus(taxTotal);
    await tx.order.update({
      where: { id: cartId },
      data: { subtotal, discountTotal, taxTotal, total },
      select: { id: true },
    });
  }
}
