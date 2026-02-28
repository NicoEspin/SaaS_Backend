import {
  Body,
  Controller,
  Get,
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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { MembershipRole } from '@prisma/client';

import { CurrentUser } from '../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import type { AuthUser } from '../common/auth/auth.types';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ListEmployeesQueryDto } from './dto/list-employees.query.dto';
import { MembershipIdParamDto } from './dto/membership-id.param.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import {
  EmployeesService,
  type EmployeeListResult,
  type EmployeeView,
} from './employees.service';

@ApiTags('Employees')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({ description: 'Insufficient role' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Post()
  @ApiOperation({ summary: 'Create employee (user + membership)' })
  @ApiCreatedResponse({ description: 'Employee created' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiConflictResponse({ description: 'Email already registered' })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateEmployeeDto,
  ): Promise<EmployeeView> {
    return this.employees.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List employees' })
  @ApiOkResponse({ description: 'Employees list' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, enum: MembershipRole })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListEmployeesQueryDto,
  ): Promise<EmployeeListResult> {
    return this.employees.list(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee by membership id' })
  @ApiOkResponse({ description: 'Employee detail' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiNotFoundResponse({ description: 'Employee not found' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Membership id (26 chars)',
  })
  async getById(
    @CurrentUser() user: AuthUser,
    @Param() params: MembershipIdParamDto,
  ): Promise<EmployeeView> {
    return this.employees.getByMembershipId(user, params.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update employee (role, active branch, name)' })
  @ApiOkResponse({ description: 'Employee updated' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiNotFoundResponse({ description: 'Employee not found' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Membership id (26 chars)',
  })
  async update(
    @CurrentUser() user: AuthUser,
    @Param() params: MembershipIdParamDto,
    @Body() dto: UpdateEmployeeDto,
  ): Promise<EmployeeView> {
    return this.employees.update(user, params.id, dto);
  }
}
