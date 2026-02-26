import { Module } from '@nestjs/common';
import { AuthModule } from './common/auth/auth.module';
import { AppConfigModule } from './common/config/config.module';
import { PrismaModule } from './common/database/prisma.module';
import { LoggingModule } from './common/logging/logging.module';
import { TenancyModule } from './common/tenancy/tenancy.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { ProductsModule } from './products/products.module';
import { SalesModule } from './modules/sales/sales.module';
import { ImportsExportsModule } from './imports-exports/imports-exports.module';
import { CategoriesModule } from './categories/categories.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    AppConfigModule,
    LoggingModule,
    PrismaModule,
    TenancyModule,
    AuthModule,
    OnboardingModule,
    CategoriesModule,
    ProductsModule,
    SalesModule,
    ImportsExportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
