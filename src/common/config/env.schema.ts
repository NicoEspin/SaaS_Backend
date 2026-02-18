import { z } from 'zod';

const logLevelSchema = z.enum([
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
]);

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: logLevelSchema.default('info'),

  // Comma-separated list of allowed origins for CORS.
  // Example: "http://localhost:3000,https://app.example.com"
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1).optional(),

  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  JWT_ACCESS_TTL: z.string().min(1).default('15m'),
  JWT_REFRESH_TTL: z.string().min(1).default('30d'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const isJest = raw.JEST_WORKER_ID != null;
  const nodeEnv = raw.NODE_ENV ?? (isJest ? 'test' : 'development');

  const effectiveRaw: Record<string, unknown> = { ...raw, NODE_ENV: nodeEnv };
  if (nodeEnv === 'test') {
    const secret = effectiveRaw.JWT_ACCESS_SECRET;
    if (typeof secret !== 'string' || secret.length < 32) {
      effectiveRaw.JWT_ACCESS_SECRET =
        'test_only_secret_change_me_1234567890123456';
    }
  }

  const parsed = envSchema.safeParse(effectiveRaw);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables:\n${parsed.error.message}`);
  }

  const env = parsed.data;

  if (env.NODE_ENV === 'test' && !env.JWT_ACCESS_SECRET) {
    env.JWT_ACCESS_SECRET = 'test_only_secret_change_me_1234567890123456';
  }

  if (env.NODE_ENV !== 'test') {
    const missing: string[] = [];
    if (!env.DATABASE_URL) missing.push('DATABASE_URL');
    if (!env.JWT_ACCESS_SECRET) missing.push('JWT_ACCESS_SECRET');

    if (missing.length > 0) {
      throw new Error(
        `Missing required env vars (${env.NODE_ENV}): ${missing.join(', ')}`,
      );
    }
  }

  return env;
}
