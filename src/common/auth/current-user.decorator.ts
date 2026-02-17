import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { AuthUser } from './auth.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!req.user) {
      throw new Error('CurrentUser used without JwtAuthGuard');
    }
    return req.user;
  },
);
