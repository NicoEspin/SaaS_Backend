import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service';
import {
  accessCookieClearOptions,
  accessCookieOptions,
  authCookieNames,
  refreshCookieClearOptions,
  refreshCookieOptions,
} from './auth.cookies';
import { LoginDto } from './dto/login.dto';
import type { Env } from '../config/env.schema';

function readCookie(req: Request, name: string): string | undefined {
  const jar: unknown = req.cookies;
  if (!jar || typeof jar !== 'object') return undefined;
  const value = (jar as Record<string, unknown>)[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Post('login')
  @HttpCode(204)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.auth.login(dto);
    const names = authCookieNames(this.config);
    res.cookie(names.access, accessToken, accessCookieOptions(this.config));
    res.cookie(names.refresh, refreshToken, refreshCookieOptions(this.config));
  }

  @Post('refresh')
  @HttpCode(204)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const names = authCookieNames(this.config);
    const refreshToken = readCookie(req, names.refresh);
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await this.auth.refresh({ refreshToken });
    res.cookie(names.access, accessToken, accessCookieOptions(this.config));
    res.cookie(
      names.refresh,
      newRefreshToken,
      refreshCookieOptions(this.config),
    );
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const names = authCookieNames(this.config);
    const refreshToken = readCookie(req, names.refresh);
    if (refreshToken) {
      await this.auth.logout({ refreshToken });
    }

    res.clearCookie(names.access, accessCookieClearOptions(this.config));
    res.clearCookie(names.refresh, refreshCookieClearOptions(this.config));
  }
}
