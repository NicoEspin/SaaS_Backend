import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductAttributeType } from '@prisma/client';

import { PrismaService } from '../common/database/prisma.service';
import { newId } from '../common/ids/new-id';
import type {
  CreateCategoryAttributeDefinitionDto,
  CreateCategoryDto,
} from './dto/create-category.dto';
import type { ListCategoriesQueryDto } from './dto/list-categories.query.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';

type CategoryAttributeDefinitionView = {
  id: string;
  key: string;
  label: string;
  type: ProductAttributeType;
  options: string[] | null;
  unit: string | null;
  isRequired: boolean;
  isVisibleInTable: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CategoryView = {
  id: string;
  name: string;
  attributeDefinitions: CategoryAttributeDefinitionView[];
  createdAt: Date;
  updatedAt: Date;
};

export type CategoryListItemView = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CategoryListResult = {
  items: CategoryListItemView[];
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
  let target: unknown;
  if (err.meta && typeof err.meta === 'object' && 'target' in err.meta) {
    target = err.meta.target;
  }
  if (Array.isArray(target)) {
    return target.filter((x): x is string => typeof x === 'string');
  }
  if (typeof target === 'string') return [target];
  return [];
}

function normalizeAttributeKey(key: string): string {
  return key.trim().toLowerCase();
}

function parseOptions(value: Prisma.JsonValue | null): string[] | null {
  if (!Array.isArray(value)) return null;
  const options = value.filter((x): x is string => typeof x === 'string');
  if (options.length !== value.length) return null;
  return options;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    dto: CreateCategoryDto,
  ): Promise<CategoryView> {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('name cannot be empty');

    const attributeDefinitions = this.normalizeAttributeDefinitions(
      dto.attributeDefinitions,
    );

    try {
      const created = await this.prisma.category.create({
        data: {
          id: newId(),
          tenantId,
          name,
          ...(attributeDefinitions.length > 0
            ? {
                productAttributeDefinitions: {
                  create: attributeDefinitions.map((d) => ({
                    id: newId(),
                    tenantId,
                    key: d.key,
                    label: d.label,
                    type: d.type,
                    ...(d.options ? { options: d.options } : {}),
                    unit: d.unit,
                    isRequired: d.isRequired,
                    isVisibleInTable: d.isVisibleInTable,
                    sortOrder: d.sortOrder,
                  })),
                },
              }
            : {}),
        },
        select: this.categorySelectWithDefinitions(),
      });

      return this.toCategoryView(created);
    } catch (err: unknown) {
      if (isP2002UniqueConstraintError(err)) {
        const targets = errorTargets(err);
        if (targets.includes('name') || targets.includes('tenantId')) {
          throw new ConflictException('Category name already exists');
        }
        throw new ConflictException('Unique constraint violation');
      }
      throw err;
    }
  }

  async list(
    tenantId: string,
    query: ListCategoriesQueryDto,
  ): Promise<CategoryListResult> {
    const limit = query.limit ?? 100;
    const take = limit + 1;

    const where: Prisma.CategoryWhereInput = { tenantId };
    if (query.cursor) where.id = { lt: query.cursor };

    const q = query.q?.trim();
    if (q) {
      where.name = { contains: q, mode: 'insensitive' };
    }

    const rows = await this.prisma.category.findMany({
      where,
      orderBy: { id: 'desc' },
      take,
      select: this.categorySelectListItem(),
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;
    return { items, nextCursor };
  }

  async getById(tenantId: string, id: string): Promise<CategoryView> {
    const category = await this.prisma.category.findFirst({
      where: { tenantId, id },
      select: this.categorySelectWithDefinitions(),
    });
    if (!category) throw new NotFoundException('Category not found');
    return this.toCategoryView(category);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryView> {
    const hasExplicitFields = dto.name !== undefined;
    if (!hasExplicitFields) {
      throw new BadRequestException('No fields to update');
    }

    const data: Prisma.CategoryUncheckedUpdateManyInput = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('name cannot be empty');
      data.name = name;
    }

    try {
      const updated = await this.prisma.category.updateMany({
        where: { tenantId, id },
        data,
      });
      if (updated.count === 0)
        throw new NotFoundException('Category not found');
      return this.getById(tenantId, id);
    } catch (err: unknown) {
      if (isP2002UniqueConstraintError(err)) {
        const targets = errorTargets(err);
        if (targets.includes('name') || targets.includes('tenantId')) {
          throw new ConflictException('Category name already exists');
        }
        throw new ConflictException('Unique constraint violation');
      }
      throw err;
    }
  }

  async remove(tenantId: string, id: string): Promise<{ deleted: true }> {
    const productsCount = await this.prisma.product.count({
      where: { tenantId, categoryId: id },
    });
    if (productsCount > 0) {
      throw new ConflictException('Cannot delete category with products');
    }

    const deleted = await this.prisma.category.deleteMany({
      where: { tenantId, id },
    });
    if (deleted.count === 0) throw new NotFoundException('Category not found');
    return { deleted: true };
  }

  async listAttributeDefinitions(
    tenantId: string,
    categoryId: string,
  ): Promise<{ items: CategoryAttributeDefinitionView[] }> {
    const category = await this.prisma.category.findFirst({
      where: { tenantId, id: categoryId },
      select: { id: true },
    });
    if (!category) throw new NotFoundException('Category not found');

    const definitions = await this.prisma.productAttributeDefinition.findMany({
      where: { tenantId, categoryId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        key: true,
        label: true,
        type: true,
        options: true,
        unit: true,
        isRequired: true,
        isVisibleInTable: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const items: CategoryAttributeDefinitionView[] = definitions.map((d) => ({
      id: d.id,
      key: d.key,
      label: d.label,
      type: d.type,
      options: parseOptions(d.options),
      unit: d.unit,
      isRequired: d.isRequired,
      isVisibleInTable: d.isVisibleInTable,
      sortOrder: d.sortOrder,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));

    return { items };
  }

  private categorySelectListItem() {
    return {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    } satisfies Prisma.CategorySelect;
  }

  private categorySelectWithDefinitions() {
    return {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      productAttributeDefinitions: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          key: true,
          label: true,
          type: true,
          options: true,
          unit: true,
          isRequired: true,
          isVisibleInTable: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    } satisfies Prisma.CategorySelect;
  }

  private toCategoryView(row: {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    productAttributeDefinitions: Array<{
      id: string;
      key: string;
      label: string;
      type: ProductAttributeType;
      options: Prisma.JsonValue | null;
      unit: string | null;
      isRequired: boolean;
      isVisibleInTable: boolean;
      sortOrder: number;
      createdAt: Date;
      updatedAt: Date;
    }>;
  }): CategoryView {
    return {
      id: row.id,
      name: row.name,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      attributeDefinitions: row.productAttributeDefinitions.map((d) => ({
        id: d.id,
        key: d.key,
        label: d.label,
        type: d.type,
        options: parseOptions(d.options),
        unit: d.unit,
        isRequired: d.isRequired,
        isVisibleInTable: d.isVisibleInTable,
        sortOrder: d.sortOrder,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
    };
  }

  private normalizeEnumDefinitionOptions(
    options: string[] | undefined,
  ): string[] {
    if (!options || options.length === 0) {
      throw new BadRequestException('ENUM attributes require options');
    }

    const normalized: string[] = [];
    const seen = new Set<string>();
    for (const option of options) {
      const value = option.trim();
      if (!value) continue;
      const key = value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      normalized.push(value);
    }

    if (normalized.length === 0) {
      throw new BadRequestException('ENUM attributes require options');
    }

    return normalized;
  }

  private normalizeAttributeDefinitions(
    definitions: CreateCategoryAttributeDefinitionDto[] | undefined,
  ): Array<{
    key: string;
    label: string;
    type: ProductAttributeType;
    options: string[] | null;
    unit: string | null;
    isRequired: boolean;
    isVisibleInTable: boolean;
    sortOrder: number;
  }> {
    if (!definitions || definitions.length === 0) return [];

    const normalized: Array<{
      key: string;
      label: string;
      type: ProductAttributeType;
      options: string[] | null;
      unit: string | null;
      isRequired: boolean;
      isVisibleInTable: boolean;
      sortOrder: number;
    }> = [];

    const seenKeys = new Set<string>();
    for (const d of definitions) {
      const key = normalizeAttributeKey(d.key);
      if (!/^[a-z0-9_]+$/.test(key)) {
        throw new BadRequestException(
          `Invalid attribute key '${d.key}'. Use letters, numbers and underscore`,
        );
      }
      if (seenKeys.has(key)) {
        throw new BadRequestException(`Duplicate attribute key '${key}'`);
      }
      seenKeys.add(key);

      const label = d.label.trim();
      if (!label)
        throw new BadRequestException('Attribute label cannot be empty');

      const unit = d.unit?.trim() || null;
      const options =
        d.type === ProductAttributeType.ENUM
          ? this.normalizeEnumDefinitionOptions(d.options)
          : null;

      normalized.push({
        key,
        label,
        type: d.type,
        options,
        unit,
        isRequired: d.isRequired ?? false,
        isVisibleInTable: d.isVisibleInTable ?? false,
        sortOrder: d.sortOrder ?? 0,
      });
    }

    return normalized;
  }
}
