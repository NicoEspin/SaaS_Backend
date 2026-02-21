import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

import type { AuthUser, JwtPayload } from './auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret = config.getOrThrow<string>('JWT_ACCESS_SECRET');
    const accessCookieName =
      config.get<string>('COOKIE_ACCESS_NAME') ?? 'accessToken';

    const accessTokenFromCookie = (req: Request): string | null => {
      const token = (req.cookies as Record<string, unknown> | undefined)?.[
        accessCookieName
      ];
      return typeof token === 'string' && token.length > 0 ? token : null;
    };

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        accessTokenFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload): AuthUser {
    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      membershipId: payload.membershipId,
      role: payload.role,
    };
  }
}
