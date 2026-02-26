import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../common/database/prisma.service';
import { newId } from '../common/ids/new-id';
import type { CreateBranchDto } from './dto/create-branch.dto';
import type { ListBranchesQueryDto } from './dto/list-branches.query.dto';
import type { UpdateBranchDto } from './dto/update-branch.dto';

export type BranchView = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type BranchListItemView = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type BranchListResult = {
  items: BranchListItemView[];
  nextCursor: string | null;
};

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateBranchDto): Promise<BranchView> {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('name cannot be empty');

    const created = await this.prisma.branch.create({
      data: {
        id: newId(),
        tenantId,
        name,
      },
      select: this.branchSelect(),
    });

    return created;
  }

  async list(
    tenantId: string,
    query: ListBranchesQueryDto,
  ): Promise<BranchListResult> {
    const limit = query.limit ?? 100;
    const take = limit + 1;

    const where: Prisma.BranchWhereInput = { tenantId };
    if (query.cursor) where.id = { lt: query.cursor };

    const q = query.q?.trim();
    if (q) {
      where.name = { contains: q, mode: 'insensitive' };
    }

    const rows = await this.prisma.branch.findMany({
      where,
      orderBy: { id: 'desc' },
      take,
      select: this.branchSelectListItem(),
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;
    return { items, nextCursor };
  }

  async getById(tenantId: string, id: string): Promise<BranchView> {
    const branch = await this.prisma.branch.findFirst({
      where: { tenantId, id },
      select: this.branchSelect(),
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateBranchDto,
  ): Promise<BranchView> {
    const hasExplicitFields = dto.name !== undefined;
    if (!hasExplicitFields)
      throw new BadRequestException('No fields to update');

    const data: Prisma.BranchUncheckedUpdateManyInput = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('name cannot be empty');
      data.name = name;
    }

    const updated = await this.prisma.branch.updateMany({
      where: { tenantId, id },
      data,
    });
    if (updated.count === 0) throw new NotFoundException('Branch not found');
    return this.getById(tenantId, id);
  }

  async remove(tenantId: string, id: string): Promise<{ deleted: true }> {
    const branch = await this.prisma.branch.findFirst({
      where: { tenantId, id },
      select: { id: true },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    const [
      inventoryCount,
      ordersCount,
      invoicesCount,
      paymentsCount,
      movements,
    ] = await Promise.all([
      this.prisma.branchInventory.count({
        where: { tenantId, branchId: id },
      }),
      this.prisma.order.count({ where: { tenantId, branchId: id } }),
      this.prisma.invoice.count({ where: { tenantId, branchId: id } }),
      this.prisma.payment.count({ where: { tenantId, branchId: id } }),
      this.prisma.stockMovement.count({ where: { tenantId, branchId: id } }),
    ]);

    const hasRelated =
      inventoryCount > 0 ||
      ordersCount > 0 ||
      invoicesCount > 0 ||
      paymentsCount > 0 ||
      movements > 0;
    if (hasRelated) {
      throw new ConflictException('Cannot delete branch with related records');
    }

    const deleted = await this.prisma.branch.deleteMany({
      where: { tenantId, id },
    });
    if (deleted.count === 0) throw new NotFoundException('Branch not found');
    return { deleted: true };
  }

  async setActiveBranch(input: {
    tenantId: string;
    membershipId: string;
    userId: string;
    branchId: string;
  }): Promise<void> {
    const exists = await this.prisma.branch.findFirst({
      where: { tenantId: input.tenantId, id: input.branchId },
      select: { id: true },
    });
    if (!exists) throw new BadRequestException('Invalid branchId');

    const updated = await this.prisma.membership.updateMany({
      where: {
        id: input.membershipId,
        tenantId: input.tenantId,
        userId: input.userId,
      },
      data: {
        activeBranchId: input.branchId,
      },
    });

    if (updated.count === 0) {
      throw new NotFoundException('Membership not found');
    }
  }

  private branchSelect() {
    return {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    } as const;
  }

  private branchSelectListItem() {
    return this.branchSelect();
  }
}
