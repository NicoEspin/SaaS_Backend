import {
  Body,
  Controller,
  Delete,
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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/auth/current-user.decorator';
import type { AuthUser } from '../common/auth/auth.types';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { CustomerIdParamDto } from './dto/customer-id.param.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers.query.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import {
  CustomersService,
  type CustomerListResult,
  type CustomerView,
} from './customers.service';

@ApiTags('Customers')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Create customer' })
  @ApiCreatedResponse({ description: 'Customer created' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiConflictResponse({ description: 'Customer code already exists' })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCustomerDto,
  ): Promise<CustomerView> {
    return this.customers.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List customers' })
  @ApiOkResponse({ description: 'Customers list' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'name', required: false, type: String })
  @ApiQuery({ name: 'code', required: false, type: String })
  @ApiQuery({ name: 'taxId', required: false, type: String })
  @ApiQuery({ name: 'email', required: false, type: String })
  @ApiQuery({ name: 'phone', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Optional. If provided, filters by active status.',
  })
  @ApiQuery({
    name: 'IsActive',
    required: false,
    type: Boolean,
    description: 'Alias for isActive (prefer isActive).',
  })
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListCustomersQueryDto,
  ): Promise<CustomerListResult> {
    return this.customers.list(user.tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by id' })
  @ApiOkResponse({ description: 'Customer detail' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Customer id (26 chars)',
  })
  async getById(
    @CurrentUser() user: AuthUser,
    @Param() params: CustomerIdParamDto,
  ): Promise<CustomerView> {
    return this.customers.getById(user.tenantId, params.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer' })
  @ApiOkResponse({ description: 'Customer updated' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiConflictResponse({ description: 'Customer code already exists' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Customer id (26 chars)',
  })
  async update(
    @CurrentUser() user: AuthUser,
    @Param() params: CustomerIdParamDto,
    @Body() dto: UpdateCustomerDto,
  ): Promise<CustomerView> {
    return this.customers.update(user.tenantId, params.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate customer (soft delete)' })
  @ApiOkResponse({
    description: 'Customer deactivated (soft delete). Returns deleted=true',
  })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Customer id (26 chars)',
  })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param() params: CustomerIdParamDto,
  ): Promise<{ deleted: true }> {
    return this.customers.remove(user.tenantId, params.id);
  }
}
