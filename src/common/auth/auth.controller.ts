import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthUser } from './auth.types';
import { AuthService, type AuthSessionResult } from './auth.service';
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

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('session')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get current session (from access token)' })
  @ApiOkResponse({ description: 'Session info' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async session(@CurrentUser() user: AuthUser): Promise<AuthSessionResult> {
    return this.auth.getSession(user);
  }

  @Post('login')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Login (sets access/refresh cookies; also returns 204)',
  })
  @ApiNoContentResponse({ description: 'Logged in. Cookies set.' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
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
  @ApiOperation({ summary: 'Refresh session (rotates refresh token cookie)' })
  @ApiNoContentResponse({ description: 'Refreshed. Cookies updated.' })
  @ApiUnauthorizedResponse({ description: 'Missing/invalid refresh token' })
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
  @ApiOperation({ summary: 'Logout (clears auth cookies)' })
  @ApiNoContentResponse({ description: 'Logged out. Cookies cleared.' })
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
