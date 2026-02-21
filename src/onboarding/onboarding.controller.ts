import { Body, Controller, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

import {
  accessCookieOptions,
  authCookieNames,
  refreshCookieOptions,
} from '../common/auth/auth.cookies';
import type { Env } from '../common/config/env.schema';
import { InitialOnboardingDto } from './dto/initial-onboarding.dto';
import {
  OnboardingService,
  type InitialOnboardingResult,
} from './onboarding.service';

export type InitialOnboardingResponse = Omit<
  InitialOnboardingResult,
  'accessToken' | 'refreshToken'
>;

@Controller('onboarding')
export class OnboardingController {
  constructor(
    private readonly onboarding: OnboardingService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Post('initial')
  async initial(
    @Body() dto: InitialOnboardingDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<InitialOnboardingResponse> {
    const result = await this.onboarding.initial(dto);

    const names = authCookieNames(this.config);
    res.cookie(
      names.access,
      result.accessToken,
      accessCookieOptions(this.config),
    );
    res.cookie(
      names.refresh,
      result.refreshToken,
      refreshCookieOptions(this.config),
    );

    return {
      tenant: result.tenant,
      user: result.user,
      membership: result.membership,
    };
  }
}
