import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import type { AuthUser } from '../common/auth/auth.types';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import {
  BranchesService,
  type BranchListResult,
  type BranchView,
} from './branches.service';
import { BranchIdParamDto } from './dto/branch-id.param.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import { ListBranchesQueryDto } from './dto/list-branches.query.dto';
import { SetActiveBranchDto } from './dto/set-active-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN')
@Controller('branches')
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBranchDto,
  ): Promise<BranchView> {
    return this.branches.create(user.tenantId, dto);
  }

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListBranchesQueryDto,
  ): Promise<BranchListResult> {
    return this.branches.list(user.tenantId, query);
  }

  @Get(':id')
  async getById(
    @CurrentUser() user: AuthUser,
    @Param() params: BranchIdParamDto,
  ): Promise<BranchView> {
    return this.branches.getById(user.tenantId, params.id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param() params: BranchIdParamDto,
    @Body() dto: UpdateBranchDto,
  ): Promise<BranchView> {
    return this.branches.update(user.tenantId, params.id, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthUser,
    @Param() params: BranchIdParamDto,
  ): Promise<{ deleted: true }> {
    return this.branches.remove(user.tenantId, params.id);
  }

  @Post('active')
  @HttpCode(204)
  async setActive(
    @CurrentUser() user: AuthUser,
    @Body() dto: SetActiveBranchDto,
  ): Promise<void> {
    await this.branches.setActiveBranch({
      tenantId: user.tenantId,
      membershipId: user.membershipId,
      userId: user.userId,
      branchId: dto.branchId,
    });
  }
}
