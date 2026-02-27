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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

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

@ApiTags('Branches')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({ description: 'Insufficient role' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN')
@Controller('branches')
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Post()
  @ApiOperation({ summary: 'Create branch' })
  @ApiCreatedResponse({ description: 'Branch created' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBranchDto,
  ): Promise<BranchView> {
    return this.branches.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List branches' })
  @ApiOkResponse({ description: 'Branches list' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListBranchesQueryDto,
  ): Promise<BranchListResult> {
    return this.branches.list(user.tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get branch by id' })
  @ApiOkResponse({ description: 'Branch detail' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiNotFoundResponse({ description: 'Branch not found' })
  @ApiParam({ name: 'id', type: String, description: 'Branch id (26 chars)' })
  async getById(
    @CurrentUser() user: AuthUser,
    @Param() params: BranchIdParamDto,
  ): Promise<BranchView> {
    return this.branches.getById(user.tenantId, params.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update branch' })
  @ApiOkResponse({ description: 'Branch updated' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiNotFoundResponse({ description: 'Branch not found' })
  @ApiParam({ name: 'id', type: String, description: 'Branch id (26 chars)' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param() params: BranchIdParamDto,
    @Body() dto: UpdateBranchDto,
  ): Promise<BranchView> {
    return this.branches.update(user.tenantId, params.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete branch' })
  @ApiOkResponse({ description: 'Branch deleted' })
  @ApiNotFoundResponse({ description: 'Branch not found' })
  @ApiConflictResponse({ description: 'Branch has related records' })
  @ApiParam({ name: 'id', type: String, description: 'Branch id (26 chars)' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param() params: BranchIdParamDto,
  ): Promise<{ deleted: true }> {
    return this.branches.remove(user.tenantId, params.id);
  }

  @Post('active')
  @HttpCode(204)
  @ApiOperation({ summary: 'Set active branch for current membership' })
  @ApiNoContentResponse({ description: 'Active branch set' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiNotFoundResponse({ description: 'Membership not found' })
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
