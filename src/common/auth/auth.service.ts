import { UnauthorizedException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

import { PrismaService } from '../database/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { newId } from '../ids/new-id';
import type { JwtPayload } from './auth.types';
import type { LoginDto } from './dto/login.dto';
import { durationToSeconds } from './jwt.util';

function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

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
    const expiresInSeconds = durationToSeconds(
      this.config.get<string>('JWT_REFRESH_TTL') ?? '30d',
      'JWT_REFRESH_TTL',
    );

    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = hashRefreshToken(token);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    await this.prisma.refreshToken.create({
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
  }): Promise<{ accessToken: string }> {
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

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { lastUsedAt: now },
      select: { id: true },
    });

    return { accessToken };
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
