import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MembershipRole, Prisma } from '@prisma/client';

import { PrismaService } from '../common/database/prisma.service';
import { EmployeesService } from './employees.service';

describe('EmployeesService', () => {
  const prisma = {
    branch: {
      findFirst: jest.fn<Promise<unknown>, [Prisma.BranchFindFirstArgs]>(),
    },
    user: {
      findUnique: jest.fn<Promise<unknown>, [Prisma.UserFindUniqueArgs]>(),
    },
    membership: {
      findMany: jest.fn<Promise<unknown[]>, [Prisma.MembershipFindManyArgs]>(),
      findFirst: jest.fn<Promise<unknown>, [Prisma.MembershipFindFirstArgs]>(),
    },
    $transaction: jest.fn<Promise<unknown>, [(c: unknown) => unknown]>(),
  };

  const tx = {
    user: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    membership: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  let service: EmployeesService;

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((fn: (c: typeof tx) => unknown) =>
      Promise.resolve(fn(tx)),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(EmployeesService);
  });

  it('rejects create when email already exists', async () => {
    prisma.branch.findFirst.mockResolvedValueOnce({ id: 'b1' });
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'u-existing' });

    await expect(
      service.create(
        {
          userId: 'u1',
          tenantId: 't1',
          membershipId: 'm-actor',
          role: 'ADMIN',
        },
        {
          fullName: 'Jane',
          email: 'jane@acme.com',
          password: 'password123',
          role: MembershipRole.CASHIER,
          branchId: '01J1QZQ0VQ8J7TQH0YV3A1BCDE',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects create when branchId is invalid', async () => {
    prisma.branch.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.create(
        {
          userId: 'u1',
          tenantId: 't1',
          membershipId: 'm-actor',
          role: 'OWNER',
        },
        {
          fullName: 'Jane',
          email: 'jane@acme.com',
          password: 'password123',
          role: MembershipRole.CASHIER,
          branchId: '01J1QZQ0VQ8J7TQH0YV3A1BCDE',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents ADMIN from assigning OWNER role', async () => {
    await expect(
      service.create(
        {
          userId: 'u1',
          tenantId: 't1',
          membershipId: 'm-actor',
          role: 'ADMIN',
        },
        {
          fullName: 'Jane',
          email: 'jane@acme.com',
          password: 'password123',
          role: MembershipRole.OWNER,
          branchId: '01J1QZQ0VQ8J7TQH0YV3A1BCDE',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('getByMembershipId is scoped by tenantId', async () => {
    prisma.membership.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.getByMembershipId(
        {
          userId: 'u1',
          tenantId: 't1',
          membershipId: 'm-actor',
          role: 'ADMIN',
        },
        'm-target',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.membership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 't1', id: 'm-target' } }),
    );
  });
});
