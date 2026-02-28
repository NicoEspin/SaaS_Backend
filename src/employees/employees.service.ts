import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipRole, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { PrismaService } from '../common/database/prisma.service';
import { newId } from '../common/ids/new-id';
import type { AuthUser } from '../common/auth/auth.types';
import type { CreateEmployeeDto } from './dto/create-employee.dto';
import type { ListEmployeesQueryDto } from './dto/list-employees.query.dto';
import type { UpdateEmployeeDto } from './dto/update-employee.dto';

export type EmployeeBranchView = {
  id: string;
  name: string;
};

export type EmployeeView = {
  membership: {
    id: string;
    role: MembershipRole;
    createdAt: Date;
  };
  user: {
    id: string;
    email: string;
    fullName: string;
    createdAt: Date;
  };
  activeBranch: EmployeeBranchView | null;
};

export type EmployeeListItemView = EmployeeView;

export type EmployeeListResult = {
  items: EmployeeListItemView[];
  nextCursor: string | null;
};

function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

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
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: AuthUser, dto: CreateEmployeeDto): Promise<EmployeeView> {
    const email = normalizeEmail(dto.email);

    if (actor.role !== 'OWNER' && dto.role === MembershipRole.OWNER) {
      throw new ForbiddenException('Only OWNER can assign OWNER role');
    }

    const branch = await this.prisma.branch.findFirst({
      where: { tenantId: actor.tenantId, id: dto.branchId },
      select: { id: true },
    });
    if (!branch) throw new BadRequestException('Invalid branchId');

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingUser) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const fullName = dto.fullName.trim();
    if (!fullName) throw new BadRequestException('fullName cannot be empty');

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            id: newId(),
            email,
            fullName,
            passwordHash,
          },
          select: {
            id: true,
            email: true,
            fullName: true,
            createdAt: true,
          },
        });

        const membership = await tx.membership.create({
          data: {
            id: newId(),
            tenantId: actor.tenantId,
            userId: user.id,
            role: dto.role,
            activeBranchId: dto.branchId,
          },
          select: {
            id: true,
            role: true,
            createdAt: true,
            activeBranch: { select: { id: true, name: true } },
          },
        });

        return { user, membership };
      });

      return {
        membership: {
          id: created.membership.id,
          role: created.membership.role,
          createdAt: created.membership.createdAt,
        },
        user: created.user,
        activeBranch: created.membership.activeBranch,
      };
    } catch (err: unknown) {
      if (isP2002UniqueConstraintError(err)) {
        const targets = errorTargets(err);
        if (targets.includes('email')) {
          throw new ConflictException('Email already registered');
        }
        throw new ConflictException('Unique constraint violation');
      }
      throw err;
    }
  }

  async list(
    actor: AuthUser,
    query: ListEmployeesQueryDto,
  ): Promise<EmployeeListResult> {
    const limit = query.limit ?? 100;
    const take = limit + 1;

    const where: Prisma.MembershipWhereInput = {
      tenantId: actor.tenantId,
    };

    if (query.cursor) where.id = { lt: query.cursor };
    if (query.role) where.role = query.role;
    if (query.branchId) where.activeBranchId = query.branchId;

    const q = query.q?.trim();
    if (q) {
      where.user = {
        is: {
          OR: [
            { email: { contains: q, mode: 'insensitive' } },
            { fullName: { contains: q, mode: 'insensitive' } },
          ],
        },
      };
    }

    const rows = await this.prisma.membership.findMany({
      where,
      orderBy: { id: 'desc' },
      take,
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: { id: true, email: true, fullName: true, createdAt: true },
        },
        activeBranch: { select: { id: true, name: true } },
      },
    });

    const hasMore = rows.length > limit;
    const itemsRaw = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore
      ? (itemsRaw[itemsRaw.length - 1]?.id ?? null)
      : null;

    const items: EmployeeListItemView[] = itemsRaw.map((m) => ({
      membership: { id: m.id, role: m.role, createdAt: m.createdAt },
      user: m.user,
      activeBranch: m.activeBranch,
    }));

    return { items, nextCursor };
  }

  async getByMembershipId(
    actor: AuthUser,
    membershipId: string,
  ): Promise<EmployeeView> {
    const row = await this.prisma.membership.findFirst({
      where: { tenantId: actor.tenantId, id: membershipId },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: { id: true, email: true, fullName: true, createdAt: true },
        },
        activeBranch: { select: { id: true, name: true } },
      },
    });
    if (!row) throw new NotFoundException('Employee not found');

    return {
      membership: { id: row.id, role: row.role, createdAt: row.createdAt },
      user: row.user,
      activeBranch: row.activeBranch,
    };
  }

  async update(
    actor: AuthUser,
    membershipId: string,
    dto: UpdateEmployeeDto,
  ): Promise<EmployeeView> {
    const hasExplicitFields =
      dto.fullName !== undefined ||
      dto.role !== undefined ||
      dto.branchId !== undefined;
    if (!hasExplicitFields) {
      throw new BadRequestException('No fields to update');
    }

    if (dto.branchId !== undefined) {
      const branch = await this.prisma.branch.findFirst({
        where: { tenantId: actor.tenantId, id: dto.branchId },
        select: { id: true },
      });
      if (!branch) throw new BadRequestException('Invalid branchId');
    }

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.membership.findFirst({
        where: { tenantId: actor.tenantId, id: membershipId },
        select: { id: true, userId: true, role: true },
      });
      if (!existing) throw new NotFoundException('Employee not found');

      if (existing.role === MembershipRole.OWNER && actor.role !== 'OWNER') {
        throw new ForbiddenException('Cannot modify an OWNER membership');
      }

      if (dto.role !== undefined) {
        if (actor.role !== 'OWNER' && dto.role === MembershipRole.OWNER) {
          throw new ForbiddenException('Only OWNER can assign OWNER role');
        }

        const updated = await tx.membership.updateMany({
          where: { tenantId: actor.tenantId, id: membershipId },
          data: { role: dto.role },
        });
        if (updated.count === 0)
          throw new NotFoundException('Employee not found');
      }

      if (dto.branchId !== undefined) {
        const updated = await tx.membership.updateMany({
          where: { tenantId: actor.tenantId, id: membershipId },
          data: { activeBranchId: dto.branchId },
        });
        if (updated.count === 0)
          throw new NotFoundException('Employee not found');
      }

      if (dto.fullName !== undefined) {
        const fullName = dto.fullName.trim();
        if (!fullName)
          throw new BadRequestException('fullName cannot be empty');
        await tx.user.updateMany({
          where: { id: existing.userId },
          data: { fullName },
        });
      }
    });

    return this.getByMembershipId(actor, membershipId);
  }
}
