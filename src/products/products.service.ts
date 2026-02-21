import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductAttributeType } from '@prisma/client';

import { PrismaService } from '../common/database/prisma.service';
import { newId } from '../common/ids/new-id';
import type { CreateProductAttributeDefinitionDto } from './dto/create-product-attribute-definition.dto';
import type { CreateProductDto } from './dto/create-product.dto';
import type { ListProductAttributeDefinitionsQueryDto } from './dto/list-product-attribute-definitions.query.dto';
import type { ListProductsQueryDto } from './dto/list-products.query.dto';
import type { UpdateProductAttributeDefinitionDto } from './dto/update-product-attribute-definition.dto';
import type { UpdateProductDto } from './dto/update-product.dto';

type ProductAttributePrimitive = string | number | boolean;
type ProductAttributes = Record<string, ProductAttributePrimitive>;

type ProductAttributeDefinitionView = {
  id: string;
  categoryId: string;
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

type ProductDisplayAttribute = {
  key: string;
  label: string;
  value: ProductAttributePrimitive;
};

export type ProductView = {
  id: string;
  code: string;
  name: string;
  category: { id: string; name: string } | null;
  description: string | null;
  attributes: ProductAttributes;
  displayAttributes: ProductDisplayAttribute[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductListResult = {
  items: ProductView[];
  nextCursor: string | null;
};

export type ProductAttributeDefinitionListResult = {
  items: ProductAttributeDefinitionView[];
};

type ProductRow = {
  id: string;
  code: string;
  name: string;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  description: string | null;
  attributes: Prisma.JsonValue | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type AttributeDefinitionRow = {
  id: string;
  categoryId: string;
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isProductAttributePrimitive(
  value: unknown,
): value is ProductAttributePrimitive {
  if (typeof value === 'string') return true;
  if (typeof value === 'boolean') return true;
  if (typeof value === 'number' && Number.isFinite(value)) return true;
  return false;
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

function parseStoredAttributes(
  value: Prisma.JsonValue | null,
): ProductAttributes {
  if (!isPlainObject(value)) return {};
  const attributes: ProductAttributes = {};
  for (const [key, rawValue] of Object.entries(value)) {
    if (isProductAttributePrimitive(rawValue)) {
      attributes[key] = rawValue;
    }
  }
  return attributes;
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
    await this.ensureCategoryExists(tenantId, categoryId);
    const attributes = await this.normalizeAndValidateAttributes(
      tenantId,
      categoryId ?? null,
      dto.attributes,
    );

    try {
      const created = await this.prisma.product.create({
        data: {
          id: newId(),
          tenantId,
          categoryId,
          code,
          name,
          description,
          attributes,
          isActive,
        },
        select: this.productSelect(),
      });
      return await this.toProductView(tenantId, created);
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
      select: this.productSelect(),
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

    const viewItems = await this.toProductViews(tenantId, items);
    return { items: viewItems, nextCursor };
  }

  async getById(tenantId: string, id: string): Promise<ProductView> {
    const product = await this.prisma.product.findFirst({
      where: { tenantId, id },
      select: this.productSelect(),
    });
    if (!product) throw new NotFoundException('Product not found');
    return this.toProductView(tenantId, product);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateProductDto,
  ): Promise<ProductView> {
    const current = await this.prisma.product.findFirst({
      where: { tenantId, id },
      select: { id: true, categoryId: true, attributes: true },
    });
    if (!current) throw new NotFoundException('Product not found');

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

    let effectiveCategoryId: string | null = current.categoryId;
    const currentAttributes = parseStoredAttributes(current.attributes);
    let effectiveAttributes: Record<string, unknown> = currentAttributes;

    if (dto.categoryId !== undefined) {
      if (dto.categoryId === null) {
        data.categoryId = null;
        effectiveCategoryId = null;
        effectiveAttributes = {};
      } else {
        const categoryId = dto.categoryId;
        await this.ensureCategoryExists(tenantId, categoryId);
        data.categoryId = categoryId;
        effectiveCategoryId = categoryId;
        if (categoryId !== current.categoryId && dto.attributes === undefined) {
          effectiveAttributes = {};
        }
      }
    }

    if (dto.attributes !== undefined) {
      effectiveAttributes = dto.attributes;
    }

    const attributes = await this.normalizeAndValidateAttributes(
      tenantId,
      effectiveCategoryId,
      effectiveAttributes,
    );
    data.attributes = attributes;

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

  async createAttributeDefinition(
    tenantId: string,
    dto: CreateProductAttributeDefinitionDto,
  ): Promise<ProductAttributeDefinitionView> {
    await this.ensureCategoryExists(tenantId, dto.categoryId);

    const key = normalizeAttributeKey(dto.key);
    const label = dto.label.trim();
    const unit = dto.unit?.trim() || null;
    const options =
      dto.type === ProductAttributeType.ENUM
        ? this.normalizeEnumDefinitionOptions(dto.options)
        : undefined;

    try {
      const created = await this.prisma.productAttributeDefinition.create({
        data: {
          id: newId(),
          tenantId,
          categoryId: dto.categoryId,
          key,
          label,
          type: dto.type,
          unit,
          ...(options ? { options } : {}),
          isRequired: dto.isRequired ?? false,
          isVisibleInTable: dto.isVisibleInTable ?? false,
          sortOrder: dto.sortOrder ?? 0,
        },
        select: this.attributeDefinitionSelect(),
      });

      return this.toAttributeDefinitionView(created);
    } catch (err: unknown) {
      if (isP2002UniqueConstraintError(err)) {
        throw new ConflictException(
          'Attribute key already exists for this category',
        );
      }
      throw err;
    }
  }

  async listAttributeDefinitions(
    tenantId: string,
    query: ListProductAttributeDefinitionsQueryDto,
  ): Promise<ProductAttributeDefinitionListResult> {
    if (query.categoryId) {
      await this.ensureCategoryExists(tenantId, query.categoryId);
    }

    const rows = await this.prisma.productAttributeDefinition.findMany({
      where: {
        tenantId,
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      },
      orderBy: [
        { categoryId: 'asc' },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
      select: this.attributeDefinitionSelect(),
    });

    return {
      items: rows.map((row) => this.toAttributeDefinitionView(row)),
    };
  }

  async updateAttributeDefinition(
    tenantId: string,
    id: string,
    dto: UpdateProductAttributeDefinitionDto,
  ): Promise<ProductAttributeDefinitionView> {
    const existing = await this.prisma.productAttributeDefinition.findFirst({
      where: { tenantId, id },
      select: this.attributeDefinitionSelect(),
    });
    if (!existing) {
      throw new NotFoundException('Attribute definition not found');
    }

    const nextCategoryId = dto.categoryId ?? existing.categoryId;
    await this.ensureCategoryExists(tenantId, nextCategoryId);

    const nextType = dto.type ?? existing.type;
    const data: Prisma.ProductAttributeDefinitionUncheckedUpdateInput = {
      categoryId: nextCategoryId,
    };

    if (dto.key !== undefined) {
      data.key = normalizeAttributeKey(dto.key);
    }
    if (dto.label !== undefined) {
      data.label = dto.label.trim();
    }
    if (dto.type !== undefined) {
      data.type = dto.type;
    }
    if (dto.unit !== undefined) {
      data.unit = dto.unit.trim() || null;
    }
    if (dto.isRequired !== undefined) {
      data.isRequired = dto.isRequired;
    }
    if (dto.isVisibleInTable !== undefined) {
      data.isVisibleInTable = dto.isVisibleInTable;
    }
    if (dto.sortOrder !== undefined) {
      data.sortOrder = dto.sortOrder;
    }
    if (dto.options !== undefined || dto.type !== undefined) {
      const nextOptions =
        dto.options ?? parseOptions(existing.options) ?? undefined;
      if (nextType === ProductAttributeType.ENUM) {
        data.options = this.normalizeEnumDefinitionOptions(nextOptions);
      } else {
        data.options = Prisma.DbNull;
      }
    }

    try {
      await this.prisma.productAttributeDefinition.updateMany({
        where: { tenantId, id },
        data,
      });
      const updated = await this.prisma.productAttributeDefinition.findFirst({
        where: { tenantId, id },
        select: this.attributeDefinitionSelect(),
      });
      if (!updated) {
        throw new NotFoundException('Attribute definition not found');
      }
      return this.toAttributeDefinitionView(updated);
    } catch (err: unknown) {
      if (isP2002UniqueConstraintError(err)) {
        throw new ConflictException(
          'Attribute key already exists for this category',
        );
      }
      throw err;
    }
  }

  async removeAttributeDefinition(
    tenantId: string,
    id: string,
  ): Promise<{ deleted: true }> {
    const deleted = await this.prisma.productAttributeDefinition.deleteMany({
      where: { tenantId, id },
    });
    if (deleted.count === 0) {
      throw new NotFoundException('Attribute definition not found');
    }
    return { deleted: true };
  }

  private productSelect() {
    return {
      id: true,
      code: true,
      name: true,
      categoryId: true,
      category: { select: { id: true, name: true } },
      description: true,
      attributes: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    } satisfies Prisma.ProductSelect;
  }

  private attributeDefinitionSelect() {
    return {
      id: true,
      categoryId: true,
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
    } satisfies Prisma.ProductAttributeDefinitionSelect;
  }

  private async ensureCategoryExists(
    tenantId: string,
    categoryId: string | undefined,
  ): Promise<void> {
    if (!categoryId) return;
    const category = await this.prisma.category.findFirst({
      where: { tenantId, id: categoryId },
      select: { id: true },
    });
    if (!category) throw new BadRequestException('Invalid categoryId');
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

  private async normalizeAndValidateAttributes(
    tenantId: string,
    categoryId: string | null,
    rawAttributes: unknown,
  ): Promise<Prisma.InputJsonObject> {
    const attributes = this.normalizeRawAttributes(rawAttributes);

    if (!categoryId) {
      if (Object.keys(attributes).length > 0) {
        throw new BadRequestException(
          'attributes require a categoryId on product',
        );
      }
      return {};
    }

    const definitions = await this.prisma.productAttributeDefinition.findMany({
      where: { tenantId, categoryId },
      select: {
        key: true,
        label: true,
        type: true,
        options: true,
        isRequired: true,
      },
    });

    const definitionByKey = new Map(
      definitions.map((definition) => [definition.key, definition]),
    );

    const normalized: Record<string, Prisma.InputJsonValue> = {};

    for (const [rawKey, rawValue] of Object.entries(attributes)) {
      const key = normalizeAttributeKey(rawKey);
      const definition = definitionByKey.get(key);
      if (!definition) {
        throw new BadRequestException(
          `Unknown attribute '${rawKey}' for this category`,
        );
      }

      const value = this.validateAttributeValue(definition, rawValue);
      normalized[key] = value;
    }

    for (const definition of definitions) {
      if (definition.isRequired && normalized[definition.key] === undefined) {
        throw new BadRequestException(
          `Required attribute '${definition.label}' is missing`,
        );
      }
    }

    return normalized;
  }

  private normalizeRawAttributes(rawAttributes: unknown): ProductAttributes {
    if (rawAttributes === undefined || rawAttributes === null) {
      return {};
    }

    if (!isPlainObject(rawAttributes)) {
      throw new BadRequestException('attributes must be an object');
    }

    const attributes: ProductAttributes = {};
    for (const [key, value] of Object.entries(rawAttributes)) {
      if (!isProductAttributePrimitive(value)) {
        throw new BadRequestException(
          `Attribute '${key}' must be string, number or boolean`,
        );
      }
      attributes[key] = value;
    }
    return attributes;
  }

  private validateAttributeValue(
    definition: {
      key: string;
      label: string;
      type: ProductAttributeType;
      options: Prisma.JsonValue | null;
    },
    value: ProductAttributePrimitive,
  ): ProductAttributePrimitive {
    switch (definition.type) {
      case ProductAttributeType.TEXT: {
        if (typeof value !== 'string') {
          throw new BadRequestException(
            `Attribute '${definition.label}' must be text`,
          );
        }
        const trimmed = value.trim();
        if (!trimmed) {
          throw new BadRequestException(
            `Attribute '${definition.label}' cannot be empty`,
          );
        }
        return trimmed;
      }
      case ProductAttributeType.NUMBER: {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          throw new BadRequestException(
            `Attribute '${definition.label}' must be a number`,
          );
        }
        return value;
      }
      case ProductAttributeType.BOOLEAN: {
        if (typeof value !== 'boolean') {
          throw new BadRequestException(
            `Attribute '${definition.label}' must be boolean`,
          );
        }
        return value;
      }
      case ProductAttributeType.DATE: {
        if (typeof value !== 'string') {
          throw new BadRequestException(
            `Attribute '${definition.label}' must be an ISO date string`,
          );
        }
        const trimmed = value.trim();
        if (!trimmed || Number.isNaN(Date.parse(trimmed))) {
          throw new BadRequestException(
            `Attribute '${definition.label}' must be a valid date`,
          );
        }
        return trimmed;
      }
      case ProductAttributeType.ENUM: {
        if (typeof value !== 'string') {
          throw new BadRequestException(
            `Attribute '${definition.label}' must be one of the allowed options`,
          );
        }
        const options = parseOptions(definition.options);
        if (!options || options.length === 0) {
          throw new BadRequestException(
            `Attribute '${definition.label}' is misconfigured`,
          );
        }
        const trimmed = value.trim();
        if (!options.includes(trimmed)) {
          throw new BadRequestException(
            `Attribute '${definition.label}' must be one of: ${options.join(', ')}`,
          );
        }
        return trimmed;
      }
      default: {
        throw new BadRequestException('Unsupported attribute type');
      }
    }
  }

  private toAttributeDefinitionView(
    row: AttributeDefinitionRow,
  ): ProductAttributeDefinitionView {
    return {
      id: row.id,
      categoryId: row.categoryId,
      key: row.key,
      label: row.label,
      type: row.type,
      options: parseOptions(row.options),
      unit: row.unit,
      isRequired: row.isRequired,
      isVisibleInTable: row.isVisibleInTable,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async toProductViews(
    tenantId: string,
    rows: ProductRow[],
  ): Promise<ProductView[]> {
    const categoryIds = [
      ...new Set(
        rows
          .map((row) => row.categoryId)
          .filter(
            (categoryId): categoryId is string =>
              typeof categoryId === 'string',
          ),
      ),
    ];

    const definitions =
      categoryIds.length > 0
        ? await this.prisma.productAttributeDefinition.findMany({
            where: {
              tenantId,
              categoryId: { in: categoryIds },
              isVisibleInTable: true,
            },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            select: {
              categoryId: true,
              key: true,
              label: true,
            },
          })
        : [];

    const visibleDefinitionsByCategory = new Map<
      string,
      Array<{ key: string; label: string }>
    >();
    for (const definition of definitions) {
      const items =
        visibleDefinitionsByCategory.get(definition.categoryId) ?? [];
      items.push({ key: definition.key, label: definition.label });
      visibleDefinitionsByCategory.set(definition.categoryId, items);
    }

    return rows.map((row) => {
      const attributes = parseStoredAttributes(row.attributes);
      const displayDefinitions = row.categoryId
        ? (visibleDefinitionsByCategory.get(row.categoryId) ?? [])
        : [];
      const displayAttributes = displayDefinitions
        .map((definition) => {
          const value = attributes[definition.key];
          if (value === undefined) return null;
          return {
            key: definition.key,
            label: definition.label,
            value,
          };
        })
        .filter(
          (
            attribute,
          ): attribute is {
            key: string;
            label: string;
            value: ProductAttributePrimitive;
          } => attribute !== null,
        );

      return {
        id: row.id,
        code: row.code,
        name: row.name,
        category: row.category,
        description: row.description,
        attributes,
        displayAttributes,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });
  }

  private async toProductView(
    tenantId: string,
    row: ProductRow,
  ): Promise<ProductView> {
    const [item] = await this.toProductViews(tenantId, [row]);
    if (!item) {
      throw new NotFoundException('Product not found');
    }
    return item;
  }
}

export type { ProductAttributeDefinitionView };
