import { ConflictException, Injectable } from '@nestjs/common';
import { MembershipRole, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { AuthService } from '../common/auth/auth.service';
import type { JwtPayload } from '../common/auth/auth.types';
import { PrismaService } from '../common/database/prisma.service';
import { newId } from '../common/ids/new-id';
import type { InitialOnboardingDto } from './dto/initial-onboarding.dto';

export type InitialOnboardingResult = {
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
  user: {
    id: string;
    email: string;
  };
  membership: {
    id: string;
    role: MembershipRole;
  };
  accessToken: string;
  refreshToken: string;
};

function normalizeSlug(input: string): string {
  return input.trim().toLowerCase();
}

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
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async initial(dto: InitialOnboardingDto): Promise<InitialOnboardingResult> {
    const tenantSlug = normalizeSlug(dto.tenant.slug);
    const tenantName = dto.tenant.name.trim();
    const email = normalizeEmail(dto.admin.email);
    const passwordHash = await bcrypt.hash(dto.admin.password, 10);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            id: newId(),
            slug: tenantSlug,
            name: tenantName,
          },
          select: { id: true, slug: true, name: true },
        });

        const user = await tx.user.create({
          data: {
            id: newId(),
            email,
            passwordHash,
          },
          select: { id: true, email: true },
        });

        const membership = await tx.membership.create({
          data: {
            id: newId(),
            tenantId: tenant.id,
            userId: user.id,
            role: MembershipRole.OWNER,
          },
          select: { id: true, role: true },
        });

        return { tenant, user, membership };
      });

      const payload: JwtPayload = {
        sub: created.user.id,
        tenantId: created.tenant.id,
        membershipId: created.membership.id,
        role: created.membership.role,
      };
      const accessToken = await this.auth.issueAccessToken(payload);
      const refreshToken = await this.auth.issueRefreshToken(
        created.membership.id,
      );

      return { ...created, accessToken, refreshToken };
    } catch (err: unknown) {
      if (isP2002UniqueConstraintError(err)) {
        const targets = errorTargets(err);
        if (targets.includes('slug')) {
          throw new ConflictException('Tenant slug already exists');
        }
        if (targets.includes('email')) {
          throw new ConflictException('Email already registered');
        }
        throw new ConflictException('Unique constraint violation');
      }

      throw err;
    }
  }
}
