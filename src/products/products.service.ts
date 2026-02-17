import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../common/database/prisma.service';
import { newId } from '../common/ids/new-id';
import type { CreateProductDto } from './dto/create-product.dto';
import type { ListProductsQueryDto } from './dto/list-products.query.dto';
import type { UpdateProductDto } from './dto/update-product.dto';

export type ProductView = {
  id: string;
  code: string;
  name: string;
  category: { id: string; name: string } | null;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductListResult = {
  items: ProductView[];
  nextCursor: string | null;
};

function isP2002UniqueConstraintError(
  err: unknown,
): err is Prisma.PrismaClientKnownRequestError {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
  );
}

function errorTargets(err: Prisma.PrismaClientKnownRequestError): string[] {
  const target = err.meta?.target;
  if (Array.isArray(target)) {
    return target.filter((x): x is string => typeof x === 'string');
  }
  if (typeof target === 'string') return [target];
  return [];
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateProductDto): Promise<ProductView> {
    const code = dto.code.trim();
    const name = dto.name.trim();
    const descriptionRaw = dto.description?.trim();
    const description =
      descriptionRaw && descriptionRaw.length > 0 ? descriptionRaw : null;
    const isActive = dto.isActive ?? true;

    if (code.length === 0)
      throw new BadRequestException('code cannot be empty');
    if (name.length === 0)
      throw new BadRequestException('name cannot be empty');

    const categoryId = dto.categoryId;
    if (categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { tenantId, id: categoryId },
        select: { id: true },
      });
      if (!category) throw new BadRequestException('Invalid categoryId');
    }

    try {
      return await this.prisma.product.create({
        data: {
          id: newId(),
          tenantId,
          categoryId,
          code,
          name,
          description,
          isActive,
        },
        select: {
          id: true,
          code: true,
          name: true,
          category: { select: { id: true, name: true } },
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (err: unknown) {
      if (isP2002UniqueConstraintError(err)) {
        const targets = errorTargets(err);
        if (targets.includes('code') || targets.includes('tenantId')) {
          throw new ConflictException('Product code already exists');
        }
        throw new ConflictException('Unique constraint violation');
      }
      throw err;
    }
  }

  async list(
    tenantId: string,
    query: ListProductsQueryDto,
  ): Promise<ProductListResult> {
    const limit = query.limit ?? 50;
    const take = limit + 1;

    const where: Prisma.ProductWhereInput = {
      tenantId,
    };
    if (query.cursor) {
      where.id = { lt: query.cursor };
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    const name = query.name?.trim();
    if (name) {
      where.name = { contains: name, mode: 'insensitive' };
    }

    const code = query.code?.trim();
    if (code) {
      where.code = { contains: code, mode: 'insensitive' };
    }

    const categoryName = query.categoryName?.trim();
    if (categoryName) {
      where.category = {
        name: { contains: categoryName, mode: 'insensitive' },
      };
    }

    const q = query.q?.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { category: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const rows = await this.prisma.product.findMany({
      where,
      orderBy: { id: 'desc' },
      take,
      select: {
        id: true,
        code: true,
        name: true,
        category: { select: { id: true, name: true } },
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;
    return { items, nextCursor };
  }

  async getById(tenantId: string, id: string): Promise<ProductView> {
    const product = await this.prisma.product.findFirst({
      where: { tenantId, id },
      select: {
        id: true,
        code: true,
        name: true,
        category: { select: { id: true, name: true } },
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateProductDto,
  ): Promise<ProductView> {
    const data: Prisma.ProductUncheckedUpdateManyInput = {};

    if (dto.code !== undefined) {
      const code = dto.code.trim();
      if (code.length === 0)
        throw new BadRequestException('code cannot be empty');
      data.code = code;
    }
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (name.length === 0)
        throw new BadRequestException('name cannot be empty');
      data.name = name;
    }
    if (dto.description !== undefined) {
      const descriptionRaw = dto.description.trim();
      data.description = descriptionRaw.length > 0 ? descriptionRaw : null;
    }
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    if (dto.categoryId !== undefined) {
      if (dto.categoryId === null) {
        data.categoryId = null;
      } else {
        const categoryId = dto.categoryId;
        const category = await this.prisma.category.findFirst({
          where: { tenantId, id: categoryId },
          select: { id: true },
        });
        if (!category) throw new BadRequestException('Invalid categoryId');
        data.categoryId = categoryId;
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    try {
      const updated = await this.prisma.product.updateMany({
        where: { tenantId, id },
        data,
      });
      if (updated.count === 0) throw new NotFoundException('Product not found');
      return await this.getById(tenantId, id);
    } catch (err: unknown) {
      if (isP2002UniqueConstraintError(err)) {
        const targets = errorTargets(err);
        if (targets.includes('code') || targets.includes('tenantId')) {
          throw new ConflictException('Product code already exists');
        }
        throw new ConflictException('Unique constraint violation');
      }
      throw err;
    }
  }

  async remove(tenantId: string, id: string): Promise<{ deleted: true }> {
    const deleted = await this.prisma.product.deleteMany({
      where: { tenantId, id },
    });
    if (deleted.count === 0) throw new NotFoundException('Product not found');
    return { deleted: true };
  }
}
