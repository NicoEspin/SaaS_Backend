import type { ConfigService } from '@nestjs/config';
import type { CookieOptions } from 'express';

import type { Env } from '../config/env.schema';
import { durationToSeconds } from './jwt.util';

export type AuthCookieNames = {
  access: string;
  refresh: string;
};

function cookieDomain(config: ConfigService<Env, true>): string | undefined {
  const raw = config.get('COOKIE_DOMAIN', { infer: true });
  const normalized = typeof raw === 'string' ? raw.trim() : '';
  return normalized.length > 0 ? normalized : undefined;
}

function cookieSecure(config: ConfigService<Env, true>): boolean {
  const configured = config.get('COOKIE_SECURE', { infer: true });
  if (typeof configured === 'boolean') return configured;
  return config.get('NODE_ENV', { infer: true }) === 'production';
}

function cookieSameSite(
  config: ConfigService<Env, true>,
): CookieOptions['sameSite'] {
  const v = config.get('COOKIE_SAMESITE', { infer: true });
  if (v === 'none') return 'none';
  if (v === 'strict') return 'strict';
  return 'lax';
}

export function authCookieNames(
  config: ConfigService<Env, true>,
): AuthCookieNames {
  return {
    access: config.get('COOKIE_ACCESS_NAME', { infer: true }),
    refresh: config.get('COOKIE_REFRESH_NAME', { infer: true }),
  };
}

export function accessCookieOptions(
  config: ConfigService<Env, true>,
): CookieOptions {
  const maxAgeSeconds = durationToSeconds(
    config.get('JWT_ACCESS_TTL', { infer: true }),
    'JWT_ACCESS_TTL',
  );

  return {
    httpOnly: true,
    secure: cookieSecure(config),
    sameSite: cookieSameSite(config),
    domain: cookieDomain(config),
    path: '/',
    maxAge: maxAgeSeconds * 1000,
  };
}

export function refreshCookieOptions(
  config: ConfigService<Env, true>,
): CookieOptions {
  const maxAgeSeconds = durationToSeconds(
    config.get('JWT_REFRESH_TTL', { infer: true }),
    'JWT_REFRESH_TTL',
  );

  return {
    httpOnly: true,
    secure: cookieSecure(config),
    sameSite: cookieSameSite(config),
    domain: cookieDomain(config),
    // Refresh cookie must be available on app routes too (e.g. Next.js middleware
    // gating /dashboard/...). Keep it scoped by domain + httpOnly + sameSite.
    path: '/',
    maxAge: maxAgeSeconds * 1000,
  };
}

export function accessCookieClearOptions(
  config: ConfigService<Env, true>,
): CookieOptions {
  const opts = accessCookieOptions(config);
  delete opts.maxAge;
  return opts;
}

export function refreshCookieClearOptions(
  config: ConfigService<Env, true>,
): CookieOptions {
  const opts = refreshCookieOptions(config);
  delete opts.maxAge;
  return opts;
}
