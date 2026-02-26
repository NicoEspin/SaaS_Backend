import { Module } from '@nestjs/common';

import { RolesGuard } from '../common/auth/roles.guard';
import { PrismaModule } from '../common/database/prisma.module';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';

@Module({
  imports: [PrismaModule],
  controllers: [BranchesController],
  providers: [BranchesService, RolesGuard],
})
export class BranchesModule {}
