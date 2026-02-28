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

    const calls = prisma.order.findFirst.mock.calls as unknown as Array<
      [unknown]
    >;
    const callArg = calls[0]?.[0] as
      | { where?: Record<string, unknown> }
      | undefined;
    if (!callArg?.where)
      throw new Error('Expected prisma.order.findFirst to be called');
    expect(callArg.where).toEqual(
      expect.objectContaining({ id: 'c1', tenantId: 't1', branchId: 'b1' }),
    );
  });

  it('scopes cart lookup by membershipId', async () => {
    prisma.order.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.getCart(
        { userId: 'u1', tenantId: 't1', membershipId: 'm1', role: 'ADMIN' },
        'b1',
        'c1',
      ),
    ).rejects.toBeTruthy();

    const calls = prisma.order.findFirst.mock.calls as unknown as Array<
      [unknown]
    >;
    const callArg = calls[0]?.[0] as
      | { where?: Record<string, unknown> }
      | undefined;
    if (!callArg?.where)
      throw new Error('Expected prisma.order.findFirst to be called');
    expect(callArg.where).toEqual(
      expect.objectContaining({ createdByMembershipId: 'm1' }),
    );
  });

  it('getCurrentCart finds DRAFT cart by membershipId + branchId', async () => {
    prisma.branch.findFirst.mockResolvedValueOnce({ id: 'b1' });
    prisma.order.findFirst.mockResolvedValueOnce({ id: 'c1' });

    const fakeCart = {
      id: 'c1',
      tenantId: 't1',
      branchId: 'b1',
      customerId: null,
      status: 'DRAFT',
      subtotal: '0',
      discountTotal: '0',
      taxTotal: '0',
      total: '0',
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
    };

    jest.spyOn(service, 'getCart').mockResolvedValueOnce(fakeCart as never);

    await expect(
      service.getCurrentCart(
        { userId: 'u1', tenantId: 't1', membershipId: 'm1', role: 'ADMIN' },
        'b1',
      ),
    ).resolves.toEqual(fakeCart);

    expect(prisma.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 't1',
          branchId: 'b1',
          status: 'DRAFT',
          createdByMembershipId: 'm1',
        },
        select: { id: true },
      }),
    );
  });

  it('getOrCreateCurrentCart returns existing cart without creating', async () => {
    prisma.branch.findFirst.mockResolvedValueOnce({ id: 'b1' });
    prisma.order.findFirst.mockResolvedValueOnce({ id: 'c1' });

    const fakeCart = {
      id: 'c1',
      tenantId: 't1',
      branchId: 'b1',
      customerId: null,
      status: 'DRAFT',
      subtotal: '0',
      discountTotal: '0',
      taxTotal: '0',
      total: '0',
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
    };
    jest.spyOn(service, 'getCart').mockResolvedValueOnce(fakeCart as never);

    await expect(
      service.getOrCreateCurrentCart(
        { userId: 'u1', tenantId: 't1', membershipId: 'm1', role: 'ADMIN' },
        'b1',
        {},
      ),
    ).resolves.toEqual(fakeCart);

    expect(prisma.order.create).not.toHaveBeenCalled();
  });
});
