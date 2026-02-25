import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { MembershipRole, Prisma } from '@prisma/client';

import { AuthService } from '../common/auth/auth.service';
import { PrismaService } from '../common/database/prisma.service';
import { OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
  type TenantCreateArgs = {
    data: { id: string; slug: string; name: string };
    select: { id: true; slug: true; name: true };
  };
  type UserCreateArgs = {
    data: { id: string; fullName: string; email: string; passwordHash: string };
    select: { id: true; email: true };
  };
  type MembershipCreateArgs = {
    data: {
      id: string;
      tenantId: string;
      userId: string;
      role: MembershipRole;
    };
    select: { id: true; role: true };
  };

  type BranchCreateArgs = {
    data: { id: string; tenantId: string; name: string };
    select: { id: true };
  };

  const tx = {
    tenant: {
      create: jest.fn<
        Promise<{ id: string; slug: string; name: string }>,
        [TenantCreateArgs]
      >(),
    },
    branch: {
      create: jest.fn<Promise<{ id: string }>, [BranchCreateArgs]>(),
    },
    user: {
      create: jest.fn<
        Promise<{ id: string; email: string }>,
        [UserCreateArgs]
      >(),
    },
    membership: {
      create: jest.fn<
        Promise<{ id: string; role: MembershipRole }>,
        [MembershipCreateArgs]
      >(),
    },
  };

  const prisma = {
    $transaction: jest.fn(),
  };

  const auth = {
    issueAccessToken: jest.fn(),
    issueRefreshToken: jest.fn(),
  };

  let service: OnboardingService;

  beforeEach(async () => {
    jest.resetAllMocks();

    prisma.$transaction.mockImplementation((fn: (c: typeof tx) => unknown) =>
      Promise.resolve(fn(tx)),
    );

    tx.tenant.create.mockResolvedValue({
      id: 't1',
      slug: 'acme',
      name: 'Acme',
    });
    tx.branch.create.mockResolvedValue({ id: 'b1' });
    tx.user.create.mockResolvedValue({ id: 'u1', email: 'admin@acme.com' });
    tx.membership.create.mockResolvedValue({
      id: 'm1',
      role: MembershipRole.OWNER,
    });
    auth.issueAccessToken.mockResolvedValue('token');
    auth.issueRefreshToken.mockResolvedValue('refresh');

    const moduleRef = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthService, useValue: auth },
      ],
    }).compile();

    service = moduleRef.get(OnboardingService);
  });

  it('creates tenant + admin and returns access token', async () => {
    const result = await service.initial({
      tenant: { name: 'Acme', slug: 'Acme' },
      branch: { name: 'Sucursal 1' },
      admin: {
        fullName: 'Admin Acme',
        email: 'Admin@Acme.com',
        password: 'password123',
      },
    });

    expect(result).toEqual({
      tenant: { id: 't1', slug: 'acme', name: 'Acme' },
      user: { id: 'u1', email: 'admin@acme.com' },
      membership: { id: 'm1', role: MembershipRole.OWNER },
      accessToken: 'token',
      refreshToken: 'refresh',
    });

    expect(tx.tenant.create).toHaveBeenCalledTimes(1);
    expect(tx.branch.create).toHaveBeenCalledTimes(1);
    expect(tx.user.create).toHaveBeenCalledTimes(1);
    expect(tx.membership.create).toHaveBeenCalledTimes(1);

    const tenantCreateArgs = tx.tenant.create.mock.calls[0][0];
    expect(tenantCreateArgs.data.slug).toBe('acme');
    expect(tenantCreateArgs.data.name).toBe('Acme');

    const branchCreateArgs = tx.branch.create.mock.calls[0][0];
    expect(branchCreateArgs.data.tenantId).toBe('t1');
    expect(branchCreateArgs.data.name).toBe('Sucursal 1');

    const userCreateArgs = tx.user.create.mock.calls[0][0];
    expect(userCreateArgs.data.email).toBe('admin@acme.com');
    expect(userCreateArgs.data.fullName).toBe('Admin Acme');

    const membershipCreateArgs = tx.membership.create.mock.calls[0][0];
    expect(membershipCreateArgs.data.role).toBe(MembershipRole.OWNER);
  });

  it('throws 409 when tenant slug already exists', async () => {
    const prismaErr = new Prisma.PrismaClientKnownRequestError('Unique', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['slug'] },
    });
    prisma.$transaction.mockRejectedValueOnce(prismaErr);

    await expect(
      service.initial({
        tenant: { name: 'Acme', slug: 'acme' },
        admin: {
          fullName: 'Admin',
          email: 'admin@acme.com',
          password: 'password123',
        },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws 409 when email already registered', async () => {
    const prismaErr = new Prisma.PrismaClientKnownRequestError('Unique', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['email'] },
    });
    prisma.$transaction.mockRejectedValueOnce(prismaErr);

    await expect(
      service.initial({
        tenant: { name: 'Acme', slug: 'acme' },
        admin: {
          fullName: 'Admin',
          email: 'admin@acme.com',
          password: 'password123',
        },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
