import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../../common/database/prisma.service';
import { SuppliersService } from './suppliers.service';

describe('SuppliersService', () => {
  const prisma = {
    supplier: {
      create: jest.fn<Promise<unknown>, [Prisma.SupplierCreateArgs]>(),
      findMany: jest.fn<Promise<unknown[]>, [Prisma.SupplierFindManyArgs]>(),
      findFirst: jest.fn<Promise<unknown>, [Prisma.SupplierFindFirstArgs]>(),
      updateMany: jest.fn<
        Promise<{ count: number }>,
        [Prisma.SupplierUpdateManyArgs]
      >(),
    },
  };

  let service: SuppliersService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        SuppliersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(SuppliersService);
  });

  it('scopes getById by tenantId', async () => {
    prisma.supplier.findFirst.mockResolvedValueOnce(null);
    await expect(service.getById('t1', 's1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.supplier.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 't1', id: 's1' } }),
    );
  });

  it('update rejects empty payload', async () => {
    await expect(service.update('t1', 's1', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
