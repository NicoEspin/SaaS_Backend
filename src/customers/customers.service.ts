import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CustomerTaxIdType,
  CustomerType,
  CustomerVatCondition,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../common/database/prisma.service';
import { newId } from '../common/ids/new-id';
import type { CreateCustomerDto } from './dto/create-customer.dto';
import type { ListCustomersQueryDto } from './dto/list-customers.query.dto';
import type { UpdateCustomerDto } from './dto/update-customer.dto';

export type CustomerView = {
  id: string;
  code: string | null;
  type: CustomerType;
  taxId: string | null;
  taxIdType: CustomerTaxIdType | null;
  vatCondition: CustomerVatCondition | null;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CustomerListItemView = {
  id: string;
  code: string | null;
  type: CustomerType;
  taxId: string | null;
  taxIdType: CustomerTaxIdType | null;
  vatCondition: CustomerVatCondition | null;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CustomerListResult = {
  items: CustomerListItemView[];
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

function normalizeOptionalString(
  value: string | null | undefined,
): string | null {
  if (value === undefined) return null;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    dto: CreateCustomerDto,
  ): Promise<CustomerView> {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('name cannot be empty');

    const code = normalizeOptionalString(dto.code);
    const taxId = normalizeOptionalString(dto.taxId);
    const email = normalizeOptionalString(dto.email);
    const phone = normalizeOptionalString(dto.phone);
    const address = normalizeOptionalString(dto.address);
    const notes = normalizeOptionalString(dto.notes);

    const type = dto.type ?? CustomerType.RETAIL;
    const taxIdType = dto.taxIdType ?? null;
    const vatCondition = dto.vatCondition ?? null;
    const isActive = dto.isActive ?? true;

    try {
      const created = await this.prisma.customer.create({
        data: {
          id: newId(),
          tenantId,
          code,
          type,
          taxId,
          taxIdType,
          vatCondition,
          name,
          email,
          phone,
          address,
          notes,
          isActive,
        },
        select: this.customerSelectFull(),
      });

      return created;
    } catch (err: unknown) {
      if (isP2002UniqueConstraintError(err)) {
        const targets = errorTargets(err);
        if (targets.includes('code') || targets.includes('tenantId')) {
          throw new ConflictException('Customer code already exists');
        }
        throw new ConflictException('Unique constraint violation');
      }
      throw err;
    }
  }

  async list(
    tenantId: string,
    query: ListCustomersQueryDto,
  ): Promise<CustomerListResult> {
    const limit = query.limit ?? 100;
    const take = limit + 1;

    const where: Prisma.CustomerWhereInput = { tenantId };
    if (query.cursor) where.id = { lt: query.cursor };
    const isActive = query.isActive ?? query.IsActive;
    if (isActive !== undefined) where.isActive = isActive;

    const name = query.name?.trim();
    if (name) {
      where.name = { contains: name, mode: 'insensitive' };
    }

    const code = query.code?.trim();
    if (code) {
      where.code = { contains: code, mode: 'insensitive' };
    }

    const taxId = query.taxId?.trim();
    if (taxId) {
      where.taxId = { contains: taxId, mode: 'insensitive' };
    }

    const email = query.email?.trim();
    if (email) {
      where.email = { contains: email, mode: 'insensitive' };
    }

    const phone = query.phone?.trim();
    if (phone) {
      where.phone = { contains: phone, mode: 'insensitive' };
    }

    const q = query.q?.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { taxId: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.customer.findMany({
      where,
      orderBy: { id: 'desc' },
      take,
      select: this.customerSelectListItem(),
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;
    return { items, nextCursor };
  }

  async getById(tenantId: string, id: string): Promise<CustomerView> {
    const customer = await this.prisma.customer.findFirst({
      where: { tenantId, id },
      select: this.customerSelectFull(),
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateCustomerDto,
  ): Promise<CustomerView> {
    const hasExplicitFields =
      dto.code !== undefined ||
      dto.type !== undefined ||
      dto.taxId !== undefined ||
      dto.taxIdType !== undefined ||
      dto.vatCondition !== undefined ||
      dto.name !== undefined ||
      dto.email !== undefined ||
      dto.phone !== undefined ||
      dto.address !== undefined ||
      dto.notes !== undefined ||
      dto.isActive !== undefined;

    if (!hasExplicitFields) {
      throw new BadRequestException('No fields to update');
    }

    const data: Prisma.CustomerUncheckedUpdateManyInput = {};

    if (dto.code !== undefined) {
      data.code = normalizeOptionalString(dto.code);
    }
    if (dto.type !== undefined) {
      const rawType = (dto as { type?: unknown }).type;
      if (rawType === null)
        throw new BadRequestException('type cannot be null');
      data.type = dto.type;
    }
    if (dto.taxId !== undefined) {
      data.taxId = normalizeOptionalString(dto.taxId);
    }
    if (dto.taxIdType !== undefined) {
      data.taxIdType = dto.taxIdType ?? null;
    }
    if (dto.vatCondition !== undefined) {
      data.vatCondition = dto.vatCondition ?? null;
    }
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('name cannot be empty');
      data.name = name;
    }
    if (dto.email !== undefined) {
      data.email = normalizeOptionalString(dto.email);
    }
    if (dto.phone !== undefined) {
      data.phone = normalizeOptionalString(dto.phone);
    }
    if (dto.address !== undefined) {
      data.address = normalizeOptionalString(dto.address);
    }
    if (dto.notes !== undefined) {
      data.notes = normalizeOptionalString(dto.notes);
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    try {
      const updated = await this.prisma.customer.updateMany({
        where: { tenantId, id },
        data,
      });
      if (updated.count === 0)
        throw new NotFoundException('Customer not found');
      return this.getById(tenantId, id);
    } catch (err: unknown) {
      if (isP2002UniqueConstraintError(err)) {
        const targets = errorTargets(err);
        if (targets.includes('code') || targets.includes('tenantId')) {
          throw new ConflictException('Customer code already exists');
        }
        throw new ConflictException('Unique constraint violation');
      }
      throw err;
    }
  }

  async remove(tenantId: string, id: string): Promise<{ deleted: true }> {
    const customer = await this.prisma.customer.findFirst({
      where: { tenantId, id },
      select: { id: true, isActive: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    if (!customer.isActive) return { deleted: true };

    await this.prisma.customer.updateMany({
      where: { tenantId, id, isActive: true },
      data: { isActive: false },
    });
    return { deleted: true };
  }

  private customerSelectFull() {
    return {
      id: true,
      code: true,
      type: true,
      taxId: true,
      taxIdType: true,
      vatCondition: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      notes: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    } satisfies Prisma.CustomerSelect;
  }

  private customerSelectListItem() {
    return {
      id: true,
      code: true,
      type: true,
      taxId: true,
      taxIdType: true,
      vatCondition: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    } satisfies Prisma.CustomerSelect;
  }
}
