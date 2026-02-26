import { UnauthorizedException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

import { PrismaService } from '../database/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { newId } from '../ids/new-id';
import type { AuthUser, JwtPayload } from './auth.types';
import type { LoginDto } from './dto/login.dto';
import { durationToSeconds } from './jwt.util';

function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

type DbClient = Prisma.TransactionClient | PrismaService;

export type AuthSessionBranchView = {
  id: string;
  name: string;
};

export type AuthSessionResult = {
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  membership: {
    id: string;
    role: AuthUser['role'];
  };
  branches: AuthSessionBranchView[];
  activeBranch: AuthSessionBranchView | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenancyService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(
    dto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tenantSlug = dto.tenantSlug.trim().toLowerCase();
    const email = dto.email.trim().toLowerCase();

    const tenant = await this.tenants.requireTenantBySlug(tenantSlug);
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });

    if (!user?.passwordHash)
      throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const membership = await this.prisma.membership.findUnique({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: user.id,
        },
      },
      select: { id: true, role: true },
    });

    if (!membership) throw new UnauthorizedException('Invalid credentials');

    const payload: JwtPayload = {
      sub: user.id,
      tenantId: tenant.id,
      membershipId: membership.id,
      role: membership.role,
    };

    const accessToken = await this.issueAccessToken(payload);
    const refreshToken = await this.issueRefreshToken(membership.id);

    return { accessToken, refreshToken };
  }

  async getSession(user: AuthUser): Promise<AuthSessionResult> {
    const membership = await this.prisma.membership.findUnique({
      where: { id: user.membershipId },
      select: {
        id: true,
        role: true,
        userId: true,
        tenantId: true,
        activeBranchId: true,
      },
    });

    if (
      !membership ||
      membership.userId !== user.userId ||
      membership.tenantId !== user.tenantId
    ) {
      throw new UnauthorizedException('Invalid session');
    }

    const [tenant, dbUser, branches] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { id: true, slug: true, name: true },
      }),
      this.prisma.user.findUnique({
        where: { id: user.userId },
        select: { id: true, email: true, fullName: true },
      }),
      this.prisma.branch.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true, name: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    if (!tenant || !dbUser) {
      throw new UnauthorizedException('Invalid session');
    }

    const activeBranch = membership.activeBranchId
      ? (branches.find((b) => b.id === membership.activeBranchId) ??
        (branches.length > 0 ? branches[0] : null))
      : branches.length > 0
        ? branches[0]
        : null;

    return {
      tenant,
      user: dbUser,
      membership: {
        id: membership.id,
        role: membership.role,
      },
      branches,
      activeBranch,
    };
  }

  async issueAccessToken(payload: JwtPayload): Promise<string> {
    const secret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    const expiresInSeconds = durationToSeconds(
      this.config.get<string>('JWT_ACCESS_TTL') ?? '15m',
      'JWT_ACCESS_TTL',
    );

    return this.jwt.signAsync(payload, {
      secret,
      expiresIn: expiresInSeconds,
    });
  }

  async issueRefreshToken(membershipId: string): Promise<string> {
    return this.issueRefreshTokenWithClient(
      this.prisma,
      membershipId,
      new Date(),
    );
  }

  private async issueRefreshTokenWithClient(
    client: DbClient,
    membershipId: string,
    now: Date,
  ): Promise<string> {
    const expiresInSeconds = durationToSeconds(
      this.config.get<string>('JWT_REFRESH_TTL') ?? '30d',
      'JWT_REFRESH_TTL',
    );

    // Keep the table bounded over time.
    await client.refreshToken.deleteMany({
      where: {
        membershipId,
        expiresAt: { lt: now },
      },
    });

    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = hashRefreshToken(token);
    const expiresAt = new Date(now.getTime() + expiresInSeconds * 1000);

    await client.refreshToken.create({
      data: {
        id: newId(),
        membershipId,
        tokenHash,
        expiresAt,
      },
      select: { id: true },
    });

    return token;
  }

  async refresh(dto: {
    refreshToken: string;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = hashRefreshToken(dto.refreshToken);
    const now = new Date();

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        membershipId: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    if (!stored || stored.revokedAt || stored.expiresAt <= now) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const membership = await this.prisma.membership.findUnique({
      where: { id: stored.membershipId },
      select: {
        id: true,
        userId: true,
        tenantId: true,
        role: true,
      },
    });

    if (!membership) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const payload: JwtPayload = {
      sub: membership.userId,
      tenantId: membership.tenantId,
      membershipId: membership.id,
      role: membership.role,
    };

    const accessToken = await this.issueAccessToken(payload);

    // Rotate refresh tokens: revoke the old one and issue a new one atomically.
    const newRefreshToken = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.refreshToken.updateMany({
        where: {
          id: stored.id,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          revokedAt: now,
          lastUsedAt: now,
        },
      });

      if (count !== 1) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.issueRefreshTokenWithClient(tx, membership.id, now);
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(dto: { refreshToken: string }): Promise<{ revoked: true }> {
    const tokenHash = hashRefreshToken(dto.refreshToken);
    const now = new Date();

    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });

    return { revoked: true };
  }
}
