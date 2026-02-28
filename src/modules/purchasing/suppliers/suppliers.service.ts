import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../../common/database/prisma.service';
import { newId } from '../../../common/ids/new-id';
import type { CreateSupplierDto } from './dto/create-supplier.dto';
import type { ListSuppliersQueryDto } from './dto/list-suppliers.query.dto';
import type { UpdateSupplierDto } from './dto/update-supplier.dto';

export type SupplierView = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxId: string | null;
  paymentTerms: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type SupplierListResult = {
  items: SupplierView[];
  nextCursor: string | null;
};

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    dto: CreateSupplierDto,
  ): Promise<SupplierView> {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('name cannot be empty');

    const created = await this.prisma.supplier.create({
      data: {
        id: newId(),
        tenantId,
        name,
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
        address: dto.address?.trim() || null,
        taxId: dto.taxId?.trim() || null,
        paymentTerms: dto.paymentTerms?.trim() || null,
        notes: dto.notes?.trim() || null,
        isActive: dto.isActive ?? true,
      },
      select: this.select(),
    });

    return created;
  }

  async list(
    tenantId: string,
    query: ListSuppliersQueryDto,
  ): Promise<SupplierListResult> {
    const limit = query.limit ?? 50;
    const take = limit + 1;

    const where: Prisma.SupplierWhereInput = { tenantId };
    if (query.cursor) {
      where.id = { lt: query.cursor };
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }
    const q = query.q?.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { taxId: { contains: q, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.supplier.findMany({
      where,
      orderBy: { id: 'desc' },
      take,
      select: this.select(),
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;
    return { items, nextCursor };
  }

  async getById(tenantId: string, id: string): Promise<SupplierView> {
    const supplier = await this.prisma.supplier.findFirst({
      where: { tenantId, id },
      select: this.select(),
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateSupplierDto,
  ): Promise<SupplierView> {
    const hasExplicitFields =
      dto.name !== undefined ||
      dto.email !== undefined ||
      dto.phone !== undefined ||
      dto.address !== undefined ||
      dto.taxId !== undefined ||
      dto.paymentTerms !== undefined ||
      dto.notes !== undefined ||
      dto.isActive !== undefined;

    if (!hasExplicitFields) {
      throw new BadRequestException('No fields to update');
    }

    const data: Prisma.SupplierUncheckedUpdateInput = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('name cannot be empty');
      data.name = name;
    }
    if (dto.email !== undefined) data.email = dto.email?.trim() || null;
    if (dto.phone !== undefined) data.phone = dto.phone?.trim() || null;
    if (dto.address !== undefined) data.address = dto.address?.trim() || null;
    if (dto.taxId !== undefined) data.taxId = dto.taxId?.trim() || null;
    if (dto.paymentTerms !== undefined)
      data.paymentTerms = dto.paymentTerms?.trim() || null;
    if (dto.notes !== undefined) data.notes = dto.notes?.trim() || null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await this.prisma.supplier.updateMany({
      where: { tenantId, id },
      data,
    });
    if (updated.count === 0) throw new NotFoundException('Supplier not found');
    return this.getById(tenantId, id);
  }

  private select() {
    return {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      taxId: true,
      paymentTerms: true,
      notes: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    } satisfies Prisma.SupplierSelect;
  }
}
