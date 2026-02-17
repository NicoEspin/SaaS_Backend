import { UnauthorizedException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';

import { PrismaService } from '../database/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import type { JwtPayload } from './auth.types';
import type { LoginDto } from './dto/login.dto';
import { durationToSeconds } from './jwt.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenancyService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
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

    return { accessToken };
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
}
