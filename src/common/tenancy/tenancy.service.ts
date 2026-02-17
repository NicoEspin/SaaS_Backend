import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';

@Injectable()
export class TenancyService {
  constructor(private readonly prisma: PrismaService) {}

  async findTenantBySlug(slug: string): Promise<{
    id: string;
    slug: string;
    name: string;
  } | null> {
    return this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true },
    });
  }

  async requireTenantBySlug(slug: string): Promise<{
    id: string;
    slug: string;
    name: string;
  }> {
    const tenant = await this.findTenantBySlug(slug);
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }
}
