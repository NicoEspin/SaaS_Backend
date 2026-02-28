import { Test } from '@nestjs/testing';
import { Prisma, StockMovementType } from '@prisma/client';

import { PrismaService } from '../../common/database/prisma.service';
import { InventoryService } from './inventory.service';

describe('InventoryService.receivePurchaseLine', () => {
  const prisma = {};

  const tx = {
    branch: {
      findFirst: jest.fn<Promise<unknown>, [Prisma.BranchFindFirstArgs]>(),
    },
    product: {
      findFirst: jest.fn<Promise<unknown>, [Prisma.ProductFindFirstArgs]>(),
    },
    branchInventory: {
      findUnique: jest.fn<
        Promise<unknown>,
        [Prisma.BranchInventoryFindUniqueArgs]
      >(),
      upsert: jest.fn<Promise<unknown>, [Prisma.BranchInventoryUpsertArgs]>(),
      update: jest.fn<Promise<unknown>, [Prisma.BranchInventoryUpdateArgs]>(),
    },
    stockMovement: {
      create: jest.fn<Promise<unknown>, [Prisma.StockMovementCreateArgs]>(),
    },
  };

  let service: InventoryService;

  beforeEach(async () => {
    jest.resetAllMocks();
    tx.branch.findFirst.mockResolvedValue({ id: 'b1' });
    tx.product.findFirst.mockResolvedValue({ id: 'p1' });
    tx.branchInventory.upsert.mockResolvedValue({ id: 'inv1' });
    tx.branchInventory.update.mockResolvedValue({ id: 'inv1' });
    tx.stockMovement.create.mockResolvedValue({ id: 'sm1' });

    const moduleRef = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(InventoryService);
  });

  it('creates new BranchInventory and sets cost = actualUnitCost', async () => {
    tx.branchInventory.findUnique.mockResolvedValueOnce(null);

    await service.receivePurchaseLine(
      't1',
      'b1',
      'p1',
      5,
      12.34,
      'r1',
      'u1',
      tx as unknown as Prisma.TransactionClient,
    );

    const upsertCalls = tx.branchInventory.upsert.mock
      .calls as unknown as Array<
      [
        {
          create: { stockOnHand: number };
          update: { stockOnHand: { increment: number } };
        },
      ]
    >;
    const upsertArg = upsertCalls[0]?.[0];
    if (!upsertArg) throw new Error('Expected branchInventory.upsert call');
    expect(upsertArg.create.stockOnHand).toBe(5);
    expect(upsertArg.update.stockOnHand.increment).toBe(5);

    const updateCalls = tx.branchInventory.update.mock
      .calls as unknown as Array<[{ data: { cost: Prisma.Decimal | null } }]>;
    const firstUpdate = updateCalls[0]?.[0];
    if (!firstUpdate) throw new Error('Expected branchInventory.update call');
    expect(firstUpdate.data.cost?.toString()).toBe('12.34');
  });

  it('updates existing cost with weighted average', async () => {
    tx.branchInventory.findUnique.mockResolvedValueOnce({
      stockOnHand: 10,
      cost: new Prisma.Decimal('5.00'),
    });

    await service.receivePurchaseLine(
      't1',
      'b1',
      'p1',
      5,
      7,
      'r1',
      'u1',
      tx as unknown as Prisma.TransactionClient,
    );

    const updateCalls = tx.branchInventory.update.mock
      .calls as unknown as Array<[{ data: { cost: Prisma.Decimal | null } }]>;
    const firstUpdate = updateCalls[0]?.[0];
    if (!firstUpdate) throw new Error('Expected branchInventory.update call');
    // (10*5 + 5*7) / 15 = 5.666... -> 5.67
    expect(firstUpdate.data.cost?.toString()).toBe('5.67');
  });

  it('creates StockMovement with correct fields', async () => {
    tx.branchInventory.findUnique.mockResolvedValueOnce({
      stockOnHand: 2,
      cost: null,
    });

    await service.receivePurchaseLine(
      't1',
      'b1',
      'p1',
      3,
      9.99,
      'r-receipt',
      'u1',
      tx as unknown as Prisma.TransactionClient,
    );

    const createCalls = tx.stockMovement.create.mock.calls as unknown as Array<
      [Prisma.StockMovementCreateArgs]
    >;
    const first = createCalls[0]?.[0];
    if (!first) throw new Error('Expected stockMovement.create call');

    expect(first.data).toMatchObject({
      tenantId: 't1',
      branchId: 'b1',
      productId: 'p1',
      type: StockMovementType.PURCHASE_RECEIPT,
      quantity: 3,
      quantityBefore: 2,
      quantityAfter: 5,
      referenceType: 'PURCHASE_RECEIPT',
      referenceId: 'r-receipt',
      createdBy: 'u1',
    });
  });
});
