import {
  Body,
  Controller,
  Get,
  Param,
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
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { CreatePurchaseReceiptDto } from './dto/create-purchase-receipt.dto';
import { ListPurchaseOrdersQueryDto } from './dto/list-purchase-orders.query.dto';
import { PurchaseOrderIdParamDto } from './dto/purchase-order-id.param.dto';
import {
  type PurchaseOrderListResult,
  type PurchaseOrderView,
  type PurchaseReceiptView,
  PurchaseOrdersService,
} from './purchase-orders.service';

@ApiTags('PurchaseOrders')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({ description: 'Insufficient role' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN', 'MANAGER')
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrders: PurchaseOrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create purchase order' })
  @ApiCreatedResponse({ description: 'Purchase order created' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrderView> {
    return this.purchaseOrders.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List purchase orders' })
  @ApiOkResponse({ description: 'Purchase orders list' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'supplierId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListPurchaseOrdersQueryDto,
  ): Promise<PurchaseOrderListResult> {
    return this.purchaseOrders.list(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase order by id' })
  @ApiOkResponse({ description: 'Purchase order detail' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiNotFoundResponse({ description: 'Purchase order not found' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Purchase order id (26 chars)',
  })
  async getById(
    @CurrentUser() user: AuthUser,
    @Param() params: PurchaseOrderIdParamDto,
  ): Promise<PurchaseOrderView> {
    return this.purchaseOrders.getById(user, params.id);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm purchase order' })
  @ApiOkResponse({ description: 'Purchase order confirmed' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiNotFoundResponse({ description: 'Purchase order not found' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Purchase order id (26 chars)',
  })
  async confirm(
    @CurrentUser() user: AuthUser,
    @Param() params: PurchaseOrderIdParamDto,
  ): Promise<PurchaseOrderView> {
    return this.purchaseOrders.confirm(user, params.id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel purchase order' })
  @ApiOkResponse({ description: 'Purchase order cancelled' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiNotFoundResponse({ description: 'Purchase order not found' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Purchase order id (26 chars)',
  })
  async cancel(
    @CurrentUser() user: AuthUser,
    @Param() params: PurchaseOrderIdParamDto,
  ): Promise<PurchaseOrderView> {
    return this.purchaseOrders.cancel(user, params.id);
  }

  @Post(':id/receipts')
  @ApiOperation({ summary: 'Receive purchase order (create receipt)' })
  @ApiCreatedResponse({ description: 'Purchase receipt created' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiNotFoundResponse({ description: 'Purchase order not found' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Purchase order id (26 chars)',
  })
  async receive(
    @CurrentUser() user: AuthUser,
    @Param() params: PurchaseOrderIdParamDto,
    @Body() dto: CreatePurchaseReceiptDto,
  ): Promise<{
    receipt: PurchaseReceiptView;
    purchaseOrder: PurchaseOrderView;
  }> {
    return this.purchaseOrders.receive(user, params.id, dto);
  }
}
