import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductAttributeType, Prisma } from '@prisma/client';

import { PrismaService } from '../../common/database/prisma.service';
import type { CreateProductDto } from '../../products/dto/create-product.dto';
import type { UpdateProductDto } from '../../products/dto/update-product.dto';
import { ProductsService } from '../../products/products.service';
import type {
  ExportBuildResult,
  ImportMode,
  ImportPreviewError,
  ParsedSpreadsheet,
} from '../import-export.types';
import type {
  ImportExportEntityAdapter,
  ImportPreviewEnvelope,
} from './import-export-entity-adapter.interface';

type ProductImportRow = {
  rowNumber: number;
  code: string;
  name?: string;
  categoryId?: string;
  description?: string;
  isActive?: boolean;
  attributes?: Record<string, string | number | boolean>;
  action: 'create' | 'update';
};

type ProductPreviewPayload = {
  rows: ProductImportRow[];
};

type ProductAttributeDefinition = {
  key: string;
  label: string;
  type: ProductAttributeType;
  options: Prisma.JsonValue | null;
  isRequired: boolean;
};

type ProductExportColumn =
  | 'code'
  | 'name'
  | 'categoryId'
  | 'categoryName'
  | 'description'
  | 'isActive'
  | 'createdAt'
  | 'updatedAt';

const BASE_EXPORT_COLUMNS: ProductExportColumn[] = [
  'code',
  'name',
  'categoryName',
  'description',
  'isActive',
];

function parseString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
    return undefined;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'si'].includes(normalized)) return true;
    if (['false', '0', 'no'].includes(normalized)) return false;
  }
  return undefined;
}

function normalizeAttributeKey(rawKey: string): string {
  return rawKey.trim().toLowerCase();
}

function parseOptions(value: Prisma.JsonValue | null): string[] | null {
  if (!Array.isArray(value)) return null;
  const items = value.filter(
    (item): item is string => typeof item === 'string',
  );
  if (items.length !== value.length) return null;
  return items;
}

function isProductPrimitive(
  value: unknown,
): value is string | number | boolean {
  if (typeof value === 'string') return true;
  if (typeof value === 'boolean') return true;
  if (typeof value === 'number' && Number.isFinite(value)) return true;
  return false;
}

@Injectable()
export class ProductsImportExportAdapter implements ImportExportEntityAdapter {
  readonly entity = 'products';

  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
  ) {}

  async buildPreview(
    tenantId: string,
    mode: ImportMode,
    parsedFile: ParsedSpreadsheet,
  ): Promise<ImportPreviewEnvelope<ProductPreviewPayload, ProductImportRow>> {
    const parseResult = this.parseRows(mode, parsedFile.rows);
    const rows = parseResult.rows;
    const errors: ImportPreviewError[] = [...parseResult.errors];
    const invalidRowNumbers = new Set<number>(parseResult.invalidRowNumbers);

    const existingProductsByCode = await this.getExistingProductsByCode(
      tenantId,
      rows.map((row) => row.code),
    );

    const categoryDefinitions = await this.getDefinitionsByCategory(
      tenantId,
      rows
        .map((row) => row.categoryId)
        .filter((value): value is string => typeof value === 'string'),
    );

    const validRows: ProductImportRow[] = [];
    let willCreate = 0;
    let willUpdate = 0;

    for (const row of rows) {
      const existing = existingProductsByCode.get(row.code);

      if (mode === 'create' && existing) {
        invalidRowNumbers.add(row.rowNumber);
        errors.push({
          rowNumber: row.rowNumber,
          column: 'code',
          message: 'Product code already exists',
        });
        continue;
      }

      if (mode === 'update' && !existing) {
        invalidRowNumbers.add(row.rowNumber);
        errors.push({
          rowNumber: row.rowNumber,
          column: 'code',
          message: 'Product code does not exist',
        });
        continue;
      }

      const action =
        mode === 'upsert'
          ? existing
            ? 'update'
            : 'create'
          : mode === 'update'
            ? 'update'
            : 'create';

      if (action === 'create' && !row.name) {
        invalidRowNumbers.add(row.rowNumber);
        errors.push({
          rowNumber: row.rowNumber,
          column: 'name',
          message: 'name is required when creating a product',
        });
        continue;
      }

      const effectiveCategoryId =
        row.categoryId ?? existing?.categoryId ?? null;
      const validationError = this.validateAttributesAgainstDefinitions(
        row,
        effectiveCategoryId,
        categoryDefinitions,
      );
      if (validationError) {
        invalidRowNumbers.add(row.rowNumber);
        errors.push(validationError);
        continue;
      }

      validRows.push({ ...row, action });
      if (action === 'create') willCreate += 1;
      if (action === 'update') willUpdate += 1;
    }

    return {
      response: {
        headers: parsedFile.headers,
        rows: validRows,
        errors,
        summary: {
          totalRows: parsedFile.rows.length,
          validRows: validRows.length,
          invalidRows: invalidRowNumbers.size,
          willCreate,
          willUpdate,
        },
      },
      payload: {
        rows: validRows,
      },
    };
  }

  async confirm(
    tenantId: string,
    _mode: ImportMode,
    payload: unknown,
  ): Promise<{
    summary: {
      processed: number;
      created: number;
      updated: number;
      failed: number;
    };
    errors: Array<{ rowNumber: number; message: string }>;
  }> {
    if (!payload || typeof payload !== 'object' || !('rows' in payload)) {
      throw new BadRequestException('Invalid import preview payload');
    }

    const rows = (payload as ProductPreviewPayload).rows;
    const errors: Array<{ rowNumber: number; message: string }> = [];
    let created = 0;
    let updated = 0;

    for (const row of rows) {
      try {
        if (row.action === 'create') {
          const dto: CreateProductDto = {
            code: row.code,
            name: row.name ?? '',
            categoryId: row.categoryId,
            description: row.description,
            isActive: row.isActive,
            attributes: row.attributes,
          };
          await this.products.create(tenantId, dto);
          created += 1;
          continue;
        }

        const existing = await this.prisma.product.findFirst({
          where: { tenantId, code: row.code },
          select: { id: true },
        });
        if (!existing) {
          throw new NotFoundException('Product code no longer exists');
        }

        const updateDto: UpdateProductDto = {};
        if (row.name !== undefined) updateDto.name = row.name;
        if (row.categoryId !== undefined) updateDto.categoryId = row.categoryId;
        if (row.description !== undefined)
          updateDto.description = row.description;
        if (row.isActive !== undefined) updateDto.isActive = row.isActive;
        if (row.attributes !== undefined) updateDto.attributes = row.attributes;

        if (Object.keys(updateDto).length === 0) {
          updated += 1;
          continue;
        }

        await this.products.update(tenantId, existing.id, updateDto);
        updated += 1;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unexpected error';
        errors.push({ rowNumber: row.rowNumber, message });
      }
    }

    return {
      summary: {
        processed: rows.length,
        created,
        updated,
        failed: errors.length,
      },
      errors,
    };
  }

  async buildExport(
    tenantId: string,
    columns: string[] | undefined,
    filters: Record<string, unknown>,
  ): Promise<ExportBuildResult> {
    const selectedColumns =
      columns && columns.length > 0 ? columns : [...BASE_EXPORT_COLUMNS];

    const where = this.buildWhereClause(tenantId, filters);
    const rows = await this.prisma.product.findMany({
      where,
      orderBy: { id: 'desc' },
      select: {
        code: true,
        name: true,
        categoryId: true,
        category: { select: { name: true } },
        description: true,
        isActive: true,
        attributes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const dataRows = rows.map((row) => {
      const rowData: Record<string, string | number | boolean | Date | null> =
        {};
      const attributes =
        row.attributes && typeof row.attributes === 'object'
          ? (row.attributes as Record<string, unknown>)
          : {};

      for (const column of selectedColumns) {
        if (column.startsWith('attr_')) {
          const key = normalizeAttributeKey(column.slice(5));
          const value = attributes[key];
          rowData[column] = isProductPrimitive(value) ? value : null;
          continue;
        }

        switch (column as ProductExportColumn) {
          case 'code':
            rowData[column] = row.code;
            break;
          case 'name':
            rowData[column] = row.name;
            break;
          case 'categoryId':
            rowData[column] = row.categoryId;
            break;
          case 'categoryName':
            rowData[column] = row.category?.name ?? null;
            break;
          case 'description':
            rowData[column] = row.description;
            break;
          case 'isActive':
            rowData[column] = row.isActive;
            break;
          case 'createdAt':
            rowData[column] = row.createdAt;
            break;
          case 'updatedAt':
            rowData[column] = row.updatedAt;
            break;
          default:
            rowData[column] = null;
        }
      }

      return rowData;
    });

    return {
      fileName: `products-export-${Date.now()}`,
      columns: selectedColumns,
      rows: dataRows,
    };
  }

  private parseRows(
    mode: ImportMode,
    rows: ParsedSpreadsheet['rows'],
  ): {
    rows: ProductImportRow[];
    errors: ImportPreviewError[];
    invalidRowNumbers: number[];
  } {
    const parsedRows: ProductImportRow[] = [];
    const errors: ImportPreviewError[] = [];
    const invalidRowNumbers = new Set<number>();

    for (const row of rows) {
      const code = parseString(row.values.code);
      const name = parseString(row.values.name);
      const categoryId = parseString(row.values.categoryId);
      const description = parseString(row.values.description);
      const isActive = parseOptionalBoolean(row.values.isActive);

      if (!code) {
        invalidRowNumbers.add(row.rowNumber);
        errors.push({
          rowNumber: row.rowNumber,
          column: 'code',
          message: 'code is required',
        });
        continue;
      }

      if (mode === 'create' && !name) {
        invalidRowNumbers.add(row.rowNumber);
        errors.push({
          rowNumber: row.rowNumber,
          column: 'name',
          message: 'name is required in create mode',
        });
        continue;
      }

      if (categoryId && categoryId.length !== 26) {
        invalidRowNumbers.add(row.rowNumber);
        errors.push({
          rowNumber: row.rowNumber,
          column: 'categoryId',
          message: 'categoryId must have 26 characters',
        });
        continue;
      }

      if (row.values.isActive !== undefined && isActive === undefined) {
        invalidRowNumbers.add(row.rowNumber);
        errors.push({
          rowNumber: row.rowNumber,
          column: 'isActive',
          message: 'isActive must be boolean',
        });
        continue;
      }

      const attributes: Record<string, string | number | boolean> = {};
      let hasAttributeError = false;
      for (const [rawKey, rawValue] of Object.entries(row.values)) {
        if (!rawKey.startsWith('attr_')) continue;
        const key = normalizeAttributeKey(rawKey.slice(5));
        if (!key) continue;
        if (!isProductPrimitive(rawValue)) {
          if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
            errors.push({
              rowNumber: row.rowNumber,
              column: rawKey,
              message: 'Attribute values must be string, number or boolean',
            });
            invalidRowNumbers.add(row.rowNumber);
            hasAttributeError = true;
            continue;
          }
          continue;
        }
        if (typeof rawValue === 'string') {
          const trimmed = rawValue.trim();
          if (!trimmed) continue;
          attributes[key] = trimmed;
        } else {
          attributes[key] = rawValue;
        }
      }

      if (hasAttributeError) {
        continue;
      }

      const hasAnyUpdateField =
        name !== undefined ||
        categoryId !== undefined ||
        description !== undefined ||
        isActive !== undefined ||
        Object.keys(attributes).length > 0;

      if (mode === 'update' && !hasAnyUpdateField) {
        invalidRowNumbers.add(row.rowNumber);
        errors.push({
          rowNumber: row.rowNumber,
          message: 'No fields to update in update mode',
        });
        continue;
      }

      parsedRows.push({
        rowNumber: row.rowNumber,
        code,
        name,
        categoryId,
        description,
        isActive,
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
        action: mode === 'update' ? 'update' : 'create',
      });
    }

    return {
      rows: parsedRows,
      errors,
      invalidRowNumbers: [...invalidRowNumbers],
    };
  }

  private async getExistingProductsByCode(
    tenantId: string,
    codes: string[],
  ): Promise<Map<string, { id: string; categoryId: string | null }>> {
    const uniqueCodes = [...new Set(codes)];
    if (uniqueCodes.length === 0) return new Map();

    const rows = await this.prisma.product.findMany({
      where: { tenantId, code: { in: uniqueCodes } },
      select: { id: true, code: true, categoryId: true },
    });

    return new Map(
      rows.map((row) => [row.code, { id: row.id, categoryId: row.categoryId }]),
    );
  }

  private async getDefinitionsByCategory(
    tenantId: string,
    categoryIds: string[],
  ): Promise<Map<string, ProductAttributeDefinition[]>> {
    const uniqueCategoryIds = [...new Set(categoryIds)];
    if (uniqueCategoryIds.length === 0) return new Map();

    const categories = await this.prisma.category.findMany({
      where: { tenantId, id: { in: uniqueCategoryIds } },
      select: { id: true },
    });

    const existingIds = new Set(categories.map((category) => category.id));
    const missing = uniqueCategoryIds.find(
      (categoryId) => !existingIds.has(categoryId),
    );
    if (missing) {
      throw new BadRequestException(`Invalid categoryId '${missing}'`);
    }

    const definitions = await this.prisma.productAttributeDefinition.findMany({
      where: { tenantId, categoryId: { in: uniqueCategoryIds } },
      select: {
        categoryId: true,
        key: true,
        label: true,
        type: true,
        options: true,
        isRequired: true,
      },
    });

    const byCategory = new Map<string, ProductAttributeDefinition[]>();
    for (const definition of definitions) {
      const list = byCategory.get(definition.categoryId) ?? [];
      list.push(definition);
      byCategory.set(definition.categoryId, list);
    }
    return byCategory;
  }

  private validateAttributesAgainstDefinitions(
    row: ProductImportRow,
    categoryId: string | null,
    definitionsByCategory: Map<string, ProductAttributeDefinition[]>,
  ): ImportPreviewError | null {
    const attributes = row.attributes ?? {};
    if (!categoryId && Object.keys(attributes).length > 0) {
      return {
        rowNumber: row.rowNumber,
        column: 'attributes',
        message: 'attributes require categoryId',
      };
    }

    if (!categoryId) return null;

    const definitions = definitionsByCategory.get(categoryId) ?? [];
    const definitionMap = new Map(
      definitions.map((definition) => [definition.key, definition]),
    );

    for (const [key, value] of Object.entries(attributes)) {
      const definition = definitionMap.get(key);
      if (!definition) {
        return {
          rowNumber: row.rowNumber,
          column: `attr_${key}`,
          message: `Unknown attribute '${key}' for selected category`,
        };
      }

      const message = this.validateAttributeValue(definition, value);
      if (message) {
        return {
          rowNumber: row.rowNumber,
          column: `attr_${key}`,
          message,
        };
      }
    }

    for (const definition of definitions) {
      if (!definition.isRequired) continue;
      if (attributes[definition.key] === undefined) {
        return {
          rowNumber: row.rowNumber,
          column: `attr_${definition.key}`,
          message: `Required attribute '${definition.label}' is missing`,
        };
      }
    }

    return null;
  }

  private validateAttributeValue(
    definition: ProductAttributeDefinition,
    value: string | number | boolean,
  ): string | null {
    switch (definition.type) {
      case ProductAttributeType.TEXT:
        if (typeof value !== 'string' || value.trim().length === 0) {
          return `Attribute '${definition.label}' must be non-empty text`;
        }
        return null;
      case ProductAttributeType.NUMBER:
        if (typeof value !== 'number') {
          return `Attribute '${definition.label}' must be a number`;
        }
        return null;
      case ProductAttributeType.BOOLEAN:
        if (typeof value !== 'boolean') {
          return `Attribute '${definition.label}' must be boolean`;
        }
        return null;
      case ProductAttributeType.DATE:
        if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
          return `Attribute '${definition.label}' must be a valid date`;
        }
        return null;
      case ProductAttributeType.ENUM: {
        if (typeof value !== 'string') {
          return `Attribute '${definition.label}' must be one of the configured options`;
        }
        const options = parseOptions(definition.options) ?? [];
        if (!options.includes(value)) {
          return `Attribute '${definition.label}' must be one of: ${options.join(', ')}`;
        }
        return null;
      }
      default:
        return 'Unsupported attribute type';
    }
  }

  private buildWhereClause(
    tenantId: string,
    filters: Record<string, unknown>,
  ): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = { tenantId };

    const q = parseString(filters.q);
    const name = parseString(filters.name);
    const code = parseString(filters.code);
    const categoryId = parseString(filters.categoryId);
    const categoryName = parseString(filters.categoryName);
    const isActive = parseOptionalBoolean(filters.isActive);

    if (name) where.name = { contains: name, mode: 'insensitive' };
    if (code) where.code = { contains: code, mode: 'insensitive' };
    if (categoryId) where.categoryId = categoryId;
    if (categoryName) {
      where.category = {
        name: { contains: categoryName, mode: 'insensitive' },
      };
    }
    if (isActive !== undefined) where.isActive = isActive;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { category: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    return where;
  }
}
