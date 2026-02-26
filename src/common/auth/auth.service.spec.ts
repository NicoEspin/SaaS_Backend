import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import crypto from 'node:crypto';

import { PrismaService } from '../database/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { AuthService } from './auth.service';
import type { AuthUser } from './auth.types';

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

describe('AuthService', () => {
  type RefreshTokenFindUniqueArgs = {
    where: { tokenHash: string };
    select: {
      id: true;
      membershipId: true;
      expiresAt: true;
      revokedAt: true;
    };
  };
  type RefreshTokenDeleteManyArgs = {
    where: { membershipId: string; expiresAt: { lt: Date } };
  };
  type RefreshTokenCreateArgs = {
    data: {
      id: string;
      membershipId: string;
      tokenHash: string;
      expiresAt: Date;
    };
    select: { id: true };
  };
  type RefreshTokenUpdateManyArgs = {
    where: { id: string; revokedAt: null; expiresAt: { gt: Date } };
    data: { revokedAt: Date; lastUsedAt: Date };
  };
  type TenantFindUniqueArgs = {
    where: { id: string };
    select: { id: true; slug: true; name: true };
  };
  type UserFindUniqueArgs = {
    where: { id: string };
    select: { id: true; email: true; fullName: true };
  };
  type BranchFindManyArgs = {
    where: { tenantId: string };
    select: { id: true; name: true };
    orderBy: { createdAt: 'asc' };
  };

  const prisma = {
    refreshToken: {
      findUnique: jest.fn<
        Promise<{
          id: string;
          membershipId: string;
          expiresAt: Date;
          revokedAt: Date | null;
        } | null>,
        [RefreshTokenFindUniqueArgs]
      >(),
      deleteMany: jest.fn<
        Promise<{ count: number }>,
        [RefreshTokenDeleteManyArgs]
      >(),
      create: jest.fn<Promise<{ id: string }>, [RefreshTokenCreateArgs]>(),
    },
    membership: {
      findUnique: jest.fn<
        Promise<{
          id: string;
          userId: string;
          tenantId: string;
          role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'CASHIER' | 'VIEWER';
          activeBranchId: string | null;
        } | null>,
        [
          {
            where: { id: string };
            select: {
              id: true;
              userId: true;
              tenantId: true;
              role: true;
              activeBranchId: true;
            };
          },
        ]
      >(),
    },
    tenant: {
      findUnique: jest.fn<
        Promise<{ id: string; slug: string; name: string } | null>,
        [TenantFindUniqueArgs]
      >(),
    },
    user: {
      findUnique: jest.fn<
        Promise<{ id: string; email: string; fullName: string } | null>,
        [UserFindUniqueArgs]
      >(),
    },
    branch: {
      findMany: jest.fn<
        Promise<Array<{ id: string; name: string }>>,
        [BranchFindManyArgs]
      >(),
    },
    $transaction: jest.fn<Promise<unknown>, [(c: unknown) => unknown]>(),
  };

  const tenants = {
    requireTenantBySlug: jest.fn(),
  };

  const jwt = {
    signAsync: jest.fn(),
  };

  const config = {
    getOrThrow: jest.fn(),
    get: jest.fn(),
  };

  let service: AuthService;

  beforeEach(async () => {
    jest.resetAllMocks();

    config.getOrThrow.mockImplementation((key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return 'secret';
      throw new Error(`Missing config: ${key}`);
    });
    config.get.mockImplementation((key: string) => {
      if (key === 'JWT_ACCESS_TTL') return '15m';
      if (key === 'JWT_REFRESH_TTL') return '1s';
      return undefined;
    });

    jwt.signAsync.mockResolvedValue('access-token');

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenancyService, useValue: tenants },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('issueRefreshToken deletes expired tokens before create', async () => {
    const now = new Date('2026-02-24T00:00:00.000Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    prisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
    prisma.refreshToken.create.mockResolvedValue({ id: 'rt1' });

    const token = await service.issueRefreshToken('m1');

    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(10);

    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: {
        membershipId: 'm1',
        expiresAt: { lt: now },
      },
    });

    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    const createArgs = prisma.refreshToken.create.mock.calls[0][0];
    expect(createArgs.select).toEqual({ id: true });
    expect(createArgs.data.membershipId).toBe('m1');
    expect(createArgs.data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createArgs.data.expiresAt).toEqual(new Date(now.getTime() + 1000));
  });

  it('refresh rotates refresh token atomically', async () => {
    const now = new Date('2026-02-24T00:00:00.000Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-old',
      membershipId: 'm1',
      expiresAt: new Date(now.getTime() + 60_000),
      revokedAt: null,
    });
    prisma.membership.findUnique.mockResolvedValue({
      id: 'm1',
      userId: 'u1',
      tenantId: 't1',
      role: 'ADMIN',
      activeBranchId: null,
    });

    const tx: {
      refreshToken: {
        updateMany: jest.Mock<
          Promise<{ count: number }>,
          [RefreshTokenUpdateManyArgs]
        >;
        deleteMany: jest.Mock<
          Promise<{ count: number }>,
          [RefreshTokenDeleteManyArgs]
        >;
        create: jest.Mock<Promise<{ id: string }>, [RefreshTokenCreateArgs]>;
      };
    } = {
      refreshToken: {
        updateMany: jest
          .fn<Promise<{ count: number }>, [RefreshTokenUpdateManyArgs]>()
          .mockResolvedValue({ count: 1 }),
        deleteMany: jest
          .fn<Promise<{ count: number }>, [RefreshTokenDeleteManyArgs]>()
          .mockResolvedValue({ count: 0 }),
        create: jest
          .fn<Promise<{ id: string }>, [RefreshTokenCreateArgs]>()
          .mockResolvedValue({ id: 'rt-new' }),
      },
    };
    prisma.$transaction.mockImplementation((fn: (c: unknown) => unknown) =>
      Promise.resolve(fn(tx)),
    );

    const result = await service.refresh({ refreshToken: 'raw-refresh' });

    expect(result.accessToken).toBe('access-token');
    expect(typeof result.refreshToken).toBe('string');
    expect(result.refreshToken.length).toBeGreaterThan(10);

    expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: sha256('raw-refresh') },
      select: {
        id: true,
        membershipId: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    expect(tx.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'rt-old',
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: {
        revokedAt: now,
        lastUsedAt: now,
      },
    });

    expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: {
        membershipId: 'm1',
        expiresAt: { lt: now },
      },
    });

    expect(tx.refreshToken.create).toHaveBeenCalledTimes(1);
    const txCreateArgs = tx.refreshToken.create.mock.calls[0][0];
    expect(txCreateArgs.select).toEqual({ id: true });
    expect(txCreateArgs.data.membershipId).toBe('m1');
    expect(txCreateArgs.data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(txCreateArgs.data.expiresAt).toEqual(new Date(now.getTime() + 1000));
  });

  it('refresh rejects when token was already rotated', async () => {
    const now = new Date('2026-02-24T00:00:00.000Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-old',
      membershipId: 'm1',
      expiresAt: new Date(now.getTime() + 60_000),
      revokedAt: null,
    });
    prisma.membership.findUnique.mockResolvedValue({
      id: 'm1',
      userId: 'u1',
      tenantId: 't1',
      role: 'ADMIN',
      activeBranchId: null,
    });

    const tx: {
      refreshToken: {
        updateMany: jest.Mock<
          Promise<{ count: number }>,
          [RefreshTokenUpdateManyArgs]
        >;
        deleteMany: jest.Mock<
          Promise<{ count: number }>,
          [RefreshTokenDeleteManyArgs]
        >;
        create: jest.Mock<Promise<{ id: string }>, [RefreshTokenCreateArgs]>;
      };
    } = {
      refreshToken: {
        updateMany: jest
          .fn<Promise<{ count: number }>, [RefreshTokenUpdateManyArgs]>()
          .mockResolvedValue({ count: 0 }),
        deleteMany: jest
          .fn<Promise<{ count: number }>, [RefreshTokenDeleteManyArgs]>()
          .mockResolvedValue({ count: 0 }),
        create: jest
          .fn<Promise<{ id: string }>, [RefreshTokenCreateArgs]>()
          .mockResolvedValue({ id: 'rt-new' }),
      },
    };
    prisma.$transaction.mockImplementation((fn: (c: unknown) => unknown) =>
      Promise.resolve(fn(tx)),
    );

    await expect(
      service.refresh({ refreshToken: 'raw-refresh' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('getSession returns tenant, user, membership, and branches', async () => {
    prisma.membership.findUnique.mockResolvedValue({
      id: 'm1',
      userId: 'u1',
      tenantId: 't1',
      role: 'ADMIN',
      activeBranchId: null,
    });
    prisma.tenant.findUnique.mockResolvedValue({
      id: 't1',
      slug: 'acme',
      name: 'Acme Inc',
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'admin@acme.com',
      fullName: 'Admin Acme',
    });
    prisma.branch.findMany.mockResolvedValue([
      { id: 'b1', name: 'Sucursal principal' },
      { id: 'b2', name: 'Centro' },
    ]);

    const user: AuthUser = {
      userId: 'u1',
      tenantId: 't1',
      membershipId: 'm1',
      role: 'ADMIN',
    };

    const result = await service.getSession(user);

    expect(result.tenant).toEqual({ id: 't1', slug: 'acme', name: 'Acme Inc' });
    expect(result.user).toEqual({
      id: 'u1',
      email: 'admin@acme.com',
      fullName: 'Admin Acme',
    });
    expect(result.membership).toEqual({ id: 'm1', role: 'ADMIN' });
    expect(result.branches).toEqual([
      { id: 'b1', name: 'Sucursal principal' },
      { id: 'b2', name: 'Centro' },
    ]);
    expect(result.activeBranch).toEqual({
      id: 'b1',
      name: 'Sucursal principal',
    });

    expect(prisma.membership.findUnique).toHaveBeenCalledWith({
      where: { id: 'm1' },
      select: {
        id: true,
        role: true,
        userId: true,
        tenantId: true,
        activeBranchId: true,
      },
    });
    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { id: 't1' },
      select: { id: true, slug: true, name: true },
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: { id: true, email: true, fullName: true },
    });
    expect(prisma.branch.findMany).toHaveBeenCalledWith({
      where: { tenantId: 't1' },
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('getSession rejects when membership does not exist', async () => {
    prisma.membership.findUnique.mockResolvedValue(null);

    const user: AuthUser = {
      userId: 'u1',
      tenantId: 't1',
      membershipId: 'm1',
      role: 'ADMIN',
    };

    await expect(service.getSession(user)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('getSession rejects when membership does not match JWT claims', async () => {
    prisma.membership.findUnique.mockResolvedValue({
      id: 'm1',
      userId: 'u2',
      tenantId: 't1',
      role: 'ADMIN',
      activeBranchId: null,
    });

    const user: AuthUser = {
      userId: 'u1',
      tenantId: 't1',
      membershipId: 'm1',
      role: 'ADMIN',
    };

    await expect(service.getSession(user)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('getSession uses membership activeBranchId when present', async () => {
    prisma.membership.findUnique.mockResolvedValue({
      id: 'm1',
      userId: 'u1',
      tenantId: 't1',
      role: 'ADMIN',
      activeBranchId: 'b2',
    });
    prisma.tenant.findUnique.mockResolvedValue({
      id: 't1',
      slug: 'acme',
      name: 'Acme Inc',
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'admin@acme.com',
      fullName: 'Admin Acme',
    });
    prisma.branch.findMany.mockResolvedValue([
      { id: 'b1', name: 'Sucursal principal' },
      { id: 'b2', name: 'Centro' },
    ]);

    const user: AuthUser = {
      userId: 'u1',
      tenantId: 't1',
      membershipId: 'm1',
      role: 'ADMIN',
    };

    const result = await service.getSession(user);

    expect(result.activeBranch).toEqual({ id: 'b2', name: 'Centro' });
  });
});
