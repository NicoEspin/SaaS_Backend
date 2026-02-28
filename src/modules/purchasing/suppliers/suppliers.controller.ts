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

import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import type { AuthUser } from '../../../common/auth/auth.types';
import { Roles } from '../../../common/auth/roles.decorator';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ListSuppliersQueryDto } from './dto/list-suppliers.query.dto';
import { SupplierIdParamDto } from './dto/supplier-id.param.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import {
  type SupplierListResult,
  type SupplierView,
  SuppliersService,
} from './suppliers.service';

@ApiTags('Suppliers')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({ description: 'Insufficient role' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN', 'MANAGER')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Post()
  @ApiOperation({ summary: 'Create supplier' })
  @ApiCreatedResponse({ description: 'Supplier created' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSupplierDto,
  ): Promise<SupplierView> {
    return this.suppliers.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List suppliers' })
  @ApiOkResponse({ description: 'Suppliers list' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListSuppliersQueryDto,
  ): Promise<SupplierListResult> {
    return this.suppliers.list(user.tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier by id' })
  @ApiOkResponse({ description: 'Supplier detail' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiNotFoundResponse({ description: 'Supplier not found' })
  @ApiParam({ name: 'id', type: String, description: 'Supplier id (26 chars)' })
  async getById(
    @CurrentUser() user: AuthUser,
    @Param() params: SupplierIdParamDto,
  ): Promise<SupplierView> {
    return this.suppliers.getById(user.tenantId, params.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update supplier' })
  @ApiOkResponse({ description: 'Supplier updated' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiNotFoundResponse({ description: 'Supplier not found' })
  @ApiParam({ name: 'id', type: String, description: 'Supplier id (26 chars)' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param() params: SupplierIdParamDto,
    @Body() dto: UpdateSupplierDto,
  ): Promise<SupplierView> {
    return this.suppliers.update(user.tenantId, params.id, dto);
  }
}
