import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor(private readonly config: ConfigService) {
    const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';
    const databaseUrl =
      config.get<string>('DATABASE_URL') ??
      'postgresql://postgres:postgres@localhost:5432/stock_saas?schema=public';

    const pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log:
        nodeEnv === 'development'
          ? ['query', 'warn', 'error']
          : ['warn', 'error'],
    });

    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    const nodeEnv = this.config.get<string>('NODE_ENV') ?? 'development';
    if (nodeEnv === 'test') return;
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
  }
}
