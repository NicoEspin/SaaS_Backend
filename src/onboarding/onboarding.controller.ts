import { Body, Controller, Post } from '@nestjs/common';

import { InitialOnboardingDto } from './dto/initial-onboarding.dto';
import {
  OnboardingService,
  type InitialOnboardingResult,
} from './onboarding.service';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Post('initial')
  async initial(
    @Body() dto: InitialOnboardingDto,
  ): Promise<InitialOnboardingResult> {
    return this.onboarding.initial(dto);
  }
}
