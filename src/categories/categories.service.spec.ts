import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ProductAttributeType } from '@prisma/client';

import { PrismaService } from '../common/database/prisma.service';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  function isUnknownArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
  }

  const prisma = {
    category: {
      create: jest.fn<Promise<unknown>, [Prisma.CategoryCreateArgs]>(),
      findMany: jest.fn<Promise<unknown[]>, [Prisma.CategoryFindManyArgs]>(),
      findFirst: jest.fn<Promise<unknown>, [Prisma.CategoryFindFirstArgs]>(),
      updateMany: jest.fn<
        Promise<{ count: number }>,
        [Prisma.CategoryUpdateManyArgs]
      >(),
      deleteMany: jest.fn<
        Promise<{ count: number }>,
        [Prisma.CategoryDeleteManyArgs]
      >(),
    },
    product: {
      count: jest.fn<Promise<number>, [Prisma.ProductCountArgs]>(),
    },
    productAttributeDefinition: {
      findMany: jest.fn<
        Promise<unknown[]>,
        [Prisma.ProductAttributeDefinitionFindManyArgs]
      >(),
    },
  };

  let service: CategoriesService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(CategoriesService);
  });

  it('scopes getById by tenantId', async () => {
    prisma.category.findFirst.mockResolvedValueOnce(null);
    await expect(service.getById('t1', 'c1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.category.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 't1', id: 'c1' } }),
    );
  });

  it('blocks delete when category has products', async () => {
    prisma.product.count.mockResolvedValueOnce(2);
    await expect(service.remove('t1', 'c1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.category.deleteMany).not.toHaveBeenCalled();
  });

  it('rejects enum attribute definitions without options', async () => {
    await expect(
      service.create('t1', {
        name: 'Ropa',
        attributeDefinitions: [
          { key: 'talle', label: 'Talle', type: ProductAttributeType.ENUM },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.category.create).not.toHaveBeenCalled();
  });

  it('normalizes attribute keys to lowercase on create', async () => {
    prisma.category.create.mockResolvedValueOnce({
      id: 'c1',
      name: 'Ropa',
      createdAt: new Date(),
      updatedAt: new Date(),
      productAttributeDefinitions: [],
    });

    await service.create('t1', {
      name: 'Ropa',
      attributeDefinitions: [
        { key: 'TALLE', label: 'Talle', type: ProductAttributeType.TEXT },
      ],
    });

    const callArg = prisma.category.create.mock.calls[0]?.[0];
    if (!callArg)
      throw new Error('Expected prisma.category.create to be called');

    const defs = callArg.data.productAttributeDefinitions;
    if (!defs || typeof defs !== 'object') {
      throw new Error(
        'Expected nested attribute definitions in create payload',
      );
    }

    const createValue = (defs as { create?: unknown }).create;
    const first = isUnknownArray(createValue) ? createValue[0] : createValue;
    if (!first || typeof first !== 'object' || !('key' in first)) {
      throw new Error('Expected at least one nested attribute definition');
    }
    const key = (first as { key: unknown }).key;
    expect(key).toBe('talle');
  });

  it('listAttributeDefinitions returns 404 if category missing', async () => {
    prisma.category.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.listAttributeDefinitions('t1', 'c1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
