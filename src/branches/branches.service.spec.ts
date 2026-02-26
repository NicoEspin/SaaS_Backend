import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../common/database/prisma.service';
import { BranchesService } from './branches.service';

describe('BranchesService', () => {
  const prisma = {
    branch: {
      create: jest.fn<Promise<unknown>, [Prisma.BranchCreateArgs]>(),
      findMany: jest.fn<Promise<unknown[]>, [Prisma.BranchFindManyArgs]>(),
      findFirst: jest.fn<Promise<unknown>, [Prisma.BranchFindFirstArgs]>(),
      updateMany: jest.fn<
        Promise<{ count: number }>,
        [Prisma.BranchUpdateManyArgs]
      >(),
      deleteMany: jest.fn<
        Promise<{ count: number }>,
        [Prisma.BranchDeleteManyArgs]
      >(),
    },
    branchInventory: {
      count: jest.fn<Promise<number>, [Prisma.BranchInventoryCountArgs]>(),
    },
    order: {
      count: jest.fn<Promise<number>, [Prisma.OrderCountArgs]>(),
    },
    invoice: {
      count: jest.fn<Promise<number>, [Prisma.InvoiceCountArgs]>(),
    },
    payment: {
      count: jest.fn<Promise<number>, [Prisma.PaymentCountArgs]>(),
    },
    stockMovement: {
      count: jest.fn<Promise<number>, [Prisma.StockMovementCountArgs]>(),
    },
    membership: {
      updateMany: jest.fn<
        Promise<{ count: number }>,
        [Prisma.MembershipUpdateManyArgs]
      >(),
    },
  };

  let service: BranchesService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        BranchesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(BranchesService);
  });

  it('scopes getById by tenantId', async () => {
    prisma.branch.findFirst.mockResolvedValueOnce(null);
    await expect(service.getById('t1', 'b1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.branch.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 't1', id: 'b1' } }),
    );
  });

  it('blocks delete when branch has related records', async () => {
    prisma.branch.findFirst.mockResolvedValueOnce({ id: 'b1' });
    prisma.branchInventory.count.mockResolvedValueOnce(1);
    prisma.order.count.mockResolvedValueOnce(0);
    prisma.invoice.count.mockResolvedValueOnce(0);
    prisma.payment.count.mockResolvedValueOnce(0);
    prisma.stockMovement.count.mockResolvedValueOnce(0);

    await expect(service.remove('t1', 'b1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.branch.deleteMany).not.toHaveBeenCalled();
  });

  it('setActiveBranch rejects invalid branchId', async () => {
    prisma.branch.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.setActiveBranch({
        tenantId: 't1',
        membershipId: 'm1',
        userId: 'u1',
        branchId: 'b-missing',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('setActiveBranch updates membership activeBranchId', async () => {
    prisma.branch.findFirst.mockResolvedValueOnce({ id: 'b1' });
    prisma.membership.updateMany.mockResolvedValueOnce({ count: 1 });

    await service.setActiveBranch({
      tenantId: 't1',
      membershipId: 'm1',
      userId: 'u1',
      branchId: 'b1',
    });

    expect(prisma.membership.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'm1', tenantId: 't1', userId: 'u1' },
      }),
    );
  });
});
