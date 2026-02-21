import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../common/database/prisma.service';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  const prisma = {
    product: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
    productAttributeDefinition: {
      findMany: jest.fn(),
    },
  };

  let service: ProductsService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(ProductsService);
  });

  it('scopes getById by tenantId', async () => {
    prisma.product.findFirst.mockResolvedValueOnce(null);
    await expect(service.getById('t1', 'p1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.product.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 't1', id: 'p1' } }),
    );
  });

  it('scopes remove by tenantId', async () => {
    prisma.product.deleteMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.remove('t1', 'p1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.product.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 't1', id: 'p1' } }),
    );
  });

  it('rejects attributes without categoryId', async () => {
    await expect(
      service.create('t1', {
        code: 'SKU-1',
        name: 'Remera',
        attributes: { color: 'rojo' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  it('validates custom attribute types against definitions', async () => {
    prisma.category.findFirst.mockResolvedValueOnce({ id: 'c1' });
    prisma.productAttributeDefinition.findMany.mockResolvedValueOnce([
      {
        key: 'color',
        label: 'Color',
        type: 'TEXT',
        options: null,
        isRequired: false,
      },
    ]);

    await expect(
      service.create('t1', {
        code: 'SKU-1',
        name: 'Remera',
        categoryId: 'c1',
        attributes: { color: 1 },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.product.create).not.toHaveBeenCalled();
  });
});
