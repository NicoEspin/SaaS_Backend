import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PurchaseOrderStatus } from '@prisma/client';

import { PrismaService } from '../../../common/database/prisma.service';
import { ProductsService } from '../../../products/products.service';
import { InventoryService } from '../../inventory/inventory.service';
import { PurchaseOrdersService } from './purchase-orders.service';

describe('PurchaseOrdersService', () => {
  const prisma = {
    branch: {
      findFirst: jest.fn<Promise<unknown>, [Prisma.BranchFindFirstArgs]>(),
    },
    supplier: {
      findFirst: jest.fn<Promise<unknown>, [Prisma.SupplierFindFirstArgs]>(),
    },
    purchaseOrder: {
      create: jest.fn<Promise<unknown>, [Prisma.PurchaseOrderCreateArgs]>(),
      findFirst: jest.fn<
        Promise<unknown>,
        [Prisma.PurchaseOrderFindFirstArgs]
      >(),
      findMany: jest.fn<
        Promise<unknown[]>,
        [Prisma.PurchaseOrderFindManyArgs]
      >(),
      updateMany: jest.fn<
        Promise<{ count: number }>,
        [Prisma.PurchaseOrderUpdateManyArgs]
      >(),
      update: jest.fn<Promise<unknown>, [Prisma.PurchaseOrderUpdateArgs]>(),
    },
    purchaseOrderItem: {
      count: jest.fn<Promise<number>, [Prisma.PurchaseOrderItemCountArgs]>(),
      findMany: jest.fn<
        Promise<unknown[]>,
        [Prisma.PurchaseOrderItemFindManyArgs]
      >(),
      findFirst: jest.fn<
        Promise<unknown>,
        [Prisma.PurchaseOrderItemFindFirstArgs]
      >(),
      update: jest.fn<Promise<unknown>, [Prisma.PurchaseOrderItemUpdateArgs]>(),
    },
    purchaseReceipt: {
      create: jest.fn<Promise<unknown>, [Prisma.PurchaseReceiptCreateArgs]>(),
      findFirst: jest.fn<
        Promise<unknown>,
        [Prisma.PurchaseReceiptFindFirstArgs]
      >(),
    },
    purchaseReceiptItem: {
      create: jest.fn<
        Promise<unknown>,
        [Prisma.PurchaseReceiptItemCreateArgs]
      >(),
    },
    branchInventory: {
      findUnique: jest.fn<
        Promise<unknown>,
        [Prisma.BranchInventoryFindUniqueArgs]
      >(),
      upsert: jest.fn<Promise<unknown>, [Prisma.BranchInventoryUpsertArgs]>(),
      updateMany: jest.fn<
        Promise<{ count: number }>,
        [Prisma.BranchInventoryUpdateManyArgs]
      >(),
    },
    stockMovement: {
      create: jest.fn<Promise<unknown>, [Prisma.StockMovementCreateArgs]>(),
    },
    $transaction: jest.fn<Promise<unknown>, [(c: unknown) => unknown]>(),
  };

  const products = {
    create: jest.fn(),
  };

  const inventory = {
    receivePurchaseLine: jest.fn<Promise<void>, unknown[]>(),
  };

  const tx = {
    product: {
      findFirst: jest.fn(),
    },
    purchaseOrder: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    purchaseOrderItem: {
      count: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    purchaseReceipt: {
      create: jest.fn(),
    },
    purchaseReceiptItem: {
      create: jest.fn(),
    },
    branchInventory: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
    },
  };

  let service: PurchaseOrdersService;

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((fn: (c: typeof tx) => unknown) =>
      Promise.resolve(fn(tx)),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: ProductsService, useValue: products },
        { provide: InventoryService, useValue: inventory },
      ],
    }).compile();

    service = moduleRef.get(PurchaseOrdersService);
  });

  const user = {
    userId: 'u1',
    tenantId: 't1',
    membershipId: 'm1',
    role: 'OWNER',
  } as const;

  it('creates purchase order with existing productId (happy path)', async () => {
    prisma.branch.findFirst.mockResolvedValueOnce({ id: 'b1' });
    prisma.supplier.findFirst.mockResolvedValueOnce({
      id: 's1',
      isActive: true,
    });

    tx.product.findFirst.mockResolvedValueOnce({
      id: 'p1',
      name: 'Prod 1',
      code: 'SKU-1',
    });
    tx.purchaseOrder.create.mockResolvedValueOnce({ id: 'po1' });

    const getById = jest
      .spyOn(service, 'getById')
      .mockResolvedValueOnce({} as unknown as never);

    await service.create(user, {
      branchId: '01J1QZQ0VQ8J7TQH0YV3A1BCDE',
      supplierId: '01J1QZQ0VQ8J7TQH0YV3A1BCDF',
      items: [{ productId: 'p1', quantityOrdered: 2, agreedUnitCost: 10 }],
    });

    expect(products.create).not.toHaveBeenCalled();
    expect(tx.purchaseOrder.create).toHaveBeenCalledTimes(1);

    const calls = tx.purchaseOrder.create.mock.calls as unknown as Array<
      [
        {
          data: { items: { create: Array<{ lineTotal: Prisma.Decimal }> } };
        },
      ]
    >;
    const args = calls[0]?.[0];
    if (!args) throw new Error('Expected tx.purchaseOrder.create call');
    expect(args.data.items.create).toHaveLength(1);
    expect(args.data.items.create[0]?.lineTotal.toString()).toBe('20');
    expect(getById).toHaveBeenCalled();
  });

  it('creates purchase order with newProduct and calls ProductsService.create with tx and without initialStock', async () => {
    prisma.branch.findFirst.mockResolvedValueOnce({ id: 'b1' });
    prisma.supplier.findFirst.mockResolvedValueOnce({
      id: 's1',
      isActive: true,
    });

    products.create.mockResolvedValueOnce({
      id: 'p-new',
      code: 'SKU-N',
      name: 'New Prod',
    });
    tx.purchaseOrder.create.mockResolvedValueOnce({ id: 'po1' });

    jest
      .spyOn(service, 'getById')
      .mockResolvedValueOnce({} as unknown as never);

    await service.create(user, {
      branchId: '01J1QZQ0VQ8J7TQH0YV3A1BCDE',
      supplierId: '01J1QZQ0VQ8J7TQH0YV3A1BCDF',
      items: [
        {
          newProduct: {
            code: 'SKU-N',
            name: 'New Prod',
            categoryId: '01J1QZQ0VQ8J7TQH0YV3A1BCDG',
            attributes: { color: 'red' },
          },
          quantityOrdered: 1,
          agreedUnitCost: 12.5,
        },
      ],
    });

    expect(products.create).toHaveBeenCalledTimes(1);
    const call = products.create.mock.calls[0] as [string, unknown, unknown];
    expect(call[0]).toBe('t1');
    expect(call[2]).toBe(tx);

    const productDto = call[1] as Record<string, unknown>;
    expect(
      Object.prototype.hasOwnProperty.call(productDto, 'initialStock'),
    ).toBe(false);
  });

  it('partial receipt increments receivedQty and sets status to PARTIALLY_RECEIVED (not COMPLETED)', async () => {
    tx.purchaseOrder.findFirst.mockResolvedValueOnce({
      id: 'po1',
      branchId: 'b1',
      supplierId: 's1',
      status: PurchaseOrderStatus.CONFIRMED,
    });

    tx.purchaseOrderItem.findMany
      .mockResolvedValueOnce([
        {
          id: 'poi1',
          productId: 'p1',
          nameSnapshot: 'Prod 1',
          codeSnapshot: 'SKU-1',
          quantityOrdered: 10,
          receivedQty: 0,
        },
      ])
      .mockResolvedValueOnce([{ quantityOrdered: 10, receivedQty: 4 }]);

    tx.purchaseReceipt.create.mockResolvedValueOnce({ id: 'r1' });
    tx.purchaseReceiptItem.create.mockResolvedValueOnce({ id: 'ri1' });
    tx.purchaseOrderItem.update.mockResolvedValueOnce({ id: 'poi1' });

    inventory.receivePurchaseLine.mockResolvedValueOnce();
    tx.purchaseOrder.update.mockResolvedValueOnce({ id: 'po1' });

    jest.spyOn(service, 'getReceipt').mockResolvedValueOnce({} as never);
    jest.spyOn(service, 'getById').mockResolvedValueOnce({} as never);

    await service.receive(user, 'po1', {
      receivedAt: new Date().toISOString(),
      items: [
        {
          purchaseOrderItemId: 'poi1',
          quantityReceived: 4,
          actualUnitCost: 10,
        },
      ],
    });

    const receiptCalls = tx.purchaseReceipt.create.mock
      .calls as unknown as Array<[{ data: { id: string } }]>;
    const receiptId = receiptCalls[0]?.[0]?.data.id;
    if (!receiptId) throw new Error('Expected receiptId');

    expect(inventory.receivePurchaseLine).toHaveBeenCalledWith(
      't1',
      'b1',
      'p1',
      4,
      10,
      receiptId,
      'u1',
      tx,
    );

    expect(tx.purchaseOrderItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'poi1' },
        data: { receivedQty: { increment: 4 } },
      }),
    );
    expect(tx.purchaseOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: PurchaseOrderStatus.PARTIALLY_RECEIVED },
      }),
    );
    expect(tx.purchaseOrder.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: PurchaseOrderStatus.COMPLETED },
      }),
    );
  });

  it('complete receipt sets status to COMPLETED automatically', async () => {
    tx.purchaseOrder.findFirst.mockResolvedValueOnce({
      id: 'po1',
      branchId: 'b1',
      supplierId: 's1',
      status: PurchaseOrderStatus.CONFIRMED,
    });

    tx.purchaseOrderItem.findMany
      .mockResolvedValueOnce([
        {
          id: 'poi1',
          productId: 'p1',
          nameSnapshot: 'Prod 1',
          codeSnapshot: 'SKU-1',
          quantityOrdered: 4,
          receivedQty: 0,
        },
      ])
      .mockResolvedValueOnce([{ quantityOrdered: 4, receivedQty: 4 }]);

    tx.purchaseReceipt.create.mockResolvedValueOnce({ id: 'r1' });
    tx.purchaseReceiptItem.create.mockResolvedValueOnce({ id: 'ri1' });
    tx.purchaseOrderItem.update.mockResolvedValueOnce({ id: 'poi1' });

    inventory.receivePurchaseLine.mockResolvedValueOnce();
    tx.purchaseOrder.update.mockResolvedValueOnce({ id: 'po1' });

    jest.spyOn(service, 'getReceipt').mockResolvedValueOnce({} as never);
    jest.spyOn(service, 'getById').mockResolvedValueOnce({} as never);

    await service.receive(user, 'po1', {
      receivedAt: new Date().toISOString(),
      items: [
        {
          purchaseOrderItemId: 'poi1',
          quantityReceived: 4,
          actualUnitCost: 10,
        },
      ],
    });

    expect(tx.purchaseOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: PurchaseOrderStatus.COMPLETED },
      }),
    );
  });

  it('rejects receiving more than pendingQty', async () => {
    tx.purchaseOrder.findFirst.mockResolvedValueOnce({
      id: 'po1',
      branchId: 'b1',
      supplierId: 's1',
      status: PurchaseOrderStatus.CONFIRMED,
    });

    tx.purchaseOrderItem.findMany.mockResolvedValueOnce([
      {
        id: 'poi1',
        productId: 'p1',
        nameSnapshot: 'Prod 1',
        codeSnapshot: 'SKU-1',
        quantityOrdered: 5,
        receivedQty: 4,
      },
    ]);

    await expect(
      service.receive(user, 'po1', {
        receivedAt: new Date().toISOString(),
        items: [
          {
            purchaseOrderItemId: 'poi1',
            quantityReceived: 2,
            actualUnitCost: 10,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.purchaseReceipt.create).not.toHaveBeenCalled();
    expect(inventory.receivePurchaseLine).not.toHaveBeenCalled();
  });

  it('calls InventoryService.receivePurchaseLine for each received line', async () => {
    tx.purchaseOrder.findFirst.mockResolvedValueOnce({
      id: 'po1',
      branchId: 'b1',
      supplierId: 's1',
      status: PurchaseOrderStatus.CONFIRMED,
    });

    tx.purchaseOrderItem.findMany
      .mockResolvedValueOnce([
        {
          id: 'poi1',
          productId: 'p1',
          nameSnapshot: 'Prod 1',
          codeSnapshot: 'SKU-1',
          quantityOrdered: 1,
          receivedQty: 0,
        },
      ])
      .mockResolvedValueOnce([{ quantityOrdered: 1, receivedQty: 1 }]);

    tx.purchaseReceipt.create.mockResolvedValueOnce({ id: 'r1' });
    tx.purchaseReceiptItem.create.mockResolvedValueOnce({ id: 'ri1' });
    tx.purchaseOrderItem.update.mockResolvedValueOnce({ id: 'poi1' });
    inventory.receivePurchaseLine.mockResolvedValueOnce();
    tx.purchaseOrder.update.mockResolvedValueOnce({ id: 'po1' });

    jest.spyOn(service, 'getReceipt').mockResolvedValueOnce({} as never);
    jest.spyOn(service, 'getById').mockResolvedValueOnce({} as never);

    await service.receive(user, 'po1', {
      receivedAt: new Date().toISOString(),
      items: [
        {
          purchaseOrderItemId: 'poi1',
          quantityReceived: 1,
          actualUnitCost: 10,
        },
      ],
    });

    expect(inventory.receivePurchaseLine).toHaveBeenCalledTimes(1);
  });

  it('confirm scopes by tenantId and DRAFT status', async () => {
    prisma.purchaseOrder.updateMany.mockResolvedValueOnce({ count: 0 });
    prisma.purchaseOrder.findFirst.mockResolvedValueOnce(null);

    await expect(service.confirm(user, 'po1')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    const calls = prisma.purchaseOrder.updateMany.mock
      .calls as unknown as Array<[Prisma.PurchaseOrderUpdateManyArgs]>;
    const first = calls[0]?.[0];
    if (!first)
      throw new Error('Expected prisma.purchaseOrder.updateMany call');
    expect(first.where).toMatchObject({ tenantId: 't1', id: 'po1' });
  });

  it('confirm throws conflict when not DRAFT', async () => {
    prisma.purchaseOrder.updateMany.mockResolvedValueOnce({ count: 0 });
    prisma.purchaseOrder.findFirst.mockResolvedValueOnce({
      id: 'po1',
      status: PurchaseOrderStatus.CONFIRMED,
    });

    await expect(service.confirm(user, 'po1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
