import { Test } from '@nestjs/testing';

import { PrismaService } from '../../../common/database/prisma.service';
import { CartsService } from './carts.service';

describe('CartsService', () => {
  const prisma = {
    branch: {
      findFirst: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
    },
    branchInventory: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    orderItem: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    invoice: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  let service: CartsService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [CartsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(CartsService);
  });

  it('scopes branch validation by tenantId', async () => {
    prisma.branch.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.createCart(
        { userId: 'u1', tenantId: 't1', membershipId: 'm1', role: 'ADMIN' },
        'b1',
        {},
      ),
    ).rejects.toBeTruthy();
    expect(prisma.branch.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'b1', tenantId: 't1' } }),
    );
  });

  it('scopes cart lookup by tenantId + branchId', async () => {
    prisma.order.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.getCart(
        { userId: 'u1', tenantId: 't1', membershipId: 'm1', role: 'ADMIN' },
        'b1',
        'c1',
      ),
    ).rejects.toBeTruthy();
    expect(prisma.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1', tenantId: 't1', branchId: 'b1' },
      }),
    );
  });
});
