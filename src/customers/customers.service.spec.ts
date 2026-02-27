import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CustomerType, Prisma } from '@prisma/client';

import { PrismaService } from '../common/database/prisma.service';
import { CustomersService } from './customers.service';

describe('CustomersService', () => {
  const prisma = {
    customer: {
      create: jest.fn<Promise<unknown>, [Prisma.CustomerCreateArgs]>(),
      findMany: jest.fn<Promise<unknown[]>, [Prisma.CustomerFindManyArgs]>(),
      findFirst: jest.fn<Promise<unknown>, [Prisma.CustomerFindFirstArgs]>(),
      updateMany: jest.fn<
        Promise<{ count: number }>,
        [Prisma.CustomerUpdateManyArgs]
      >(),
    },
  };

  let service: CustomersService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(CustomersService);
  });

  it('scopes getById by tenantId', async () => {
    prisma.customer.findFirst.mockResolvedValueOnce(null);
    await expect(service.getById('t1', 'c1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.customer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 't1', id: 'c1' } }),
    );
  });

  it('defaults customer type to RETAIL on create', async () => {
    prisma.customer.create.mockResolvedValueOnce({
      id: 'c1',
      code: null,
      type: CustomerType.RETAIL,
      taxId: null,
      taxIdType: null,
      vatCondition: null,
      name: 'Juan',
      email: null,
      phone: null,
      address: null,
      notes: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.create('t1', { name: 'Juan' });
    const callArg = prisma.customer.create.mock.calls[0]?.[0];
    if (!callArg)
      throw new Error('Expected prisma.customer.create to be called');
    expect(callArg.data.tenantId).toBe('t1');
    expect(callArg.data.type).toBe(CustomerType.RETAIL);
  });

  it('throws 409 when customer code already exists', async () => {
    const prismaErr = new Prisma.PrismaClientKnownRequestError('Unique', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['tenantId', 'code'] },
    });
    prisma.customer.create.mockRejectedValueOnce(prismaErr);

    await expect(
      service.create('t1', { name: 'Juan', code: 'C001' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('list scopes by tenantId (no default isActive filter)', async () => {
    prisma.customer.findMany.mockResolvedValueOnce([]);
    await service.list('t1', {});
    const callArg = prisma.customer.findMany.mock.calls[0]?.[0];
    if (!callArg)
      throw new Error('Expected prisma.customer.findMany to be called');

    expect(callArg.where).toEqual(expect.objectContaining({ tenantId: 't1' }));
  });

  it('update rejects when no fields provided', async () => {
    await expect(service.update('t1', 'c1', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('remove deactivates instead of deleting', async () => {
    prisma.customer.findFirst.mockResolvedValueOnce({
      id: 'c1',
      isActive: true,
    });
    prisma.customer.updateMany.mockResolvedValueOnce({ count: 1 });

    await expect(service.remove('t1', 'c1')).resolves.toEqual({
      deleted: true,
    });
    expect(prisma.customer.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 't1', id: 'c1', isActive: true },
        data: { isActive: false },
      }),
    );
  });
});
