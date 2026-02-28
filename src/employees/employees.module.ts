import { Module } from '@nestjs/common';

import { RolesGuard } from '../common/auth/roles.guard';
import { PrismaModule } from '../common/database/prisma.module';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

@Module({
  imports: [PrismaModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, RolesGuard],
})
export class EmployeesModule {}
