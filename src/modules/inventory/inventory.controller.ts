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
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthUser } from '../../common/auth/auth.types';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { BranchIdParamDto } from './dto/branch-id.param.dto';
import { ChangeInventoryPriceDto } from './dto/change-inventory-price.dto';
import { ListBranchInventoryQueryDto } from './dto/list-branch-inventory.query.dto';
import { ProductIdParamDto } from './dto/product-id.param.dto';
import { TransferInventoryDto } from './dto/transfer-inventory.dto';
import {
  InventoryService,
  type BranchInventoryListResult,
  type PriceChangeResult,
  type ProductStockResult,
  type StockAdjustmentResult,
  type StockTransferResult,
} from './inventory.service';

@ApiTags('Inventory')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@UseGuards(JwtAuthGuard)
@Controller()
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('branches/:branchId/inventory')
  @ApiOperation({ summary: 'List inventory by branch' })
  @ApiOkResponse({ description: 'Branch inventory list' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiParam({
    name: 'branchId',
    type: String,
    description: 'Branch id (26 chars)',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  async getStockByBranch(
    @CurrentUser() user: AuthUser,
    @Param() params: BranchIdParamDto,
    @Query() query: ListBranchInventoryQueryDto,
  ): Promise<BranchInventoryListResult> {
    return this.inventory.getStockByBranch(
      user.tenantId,
      params.branchId,
      query,
    );
  }

  @Post('branches/:branchId/inventory/adjustments')
  @ApiOperation({ summary: 'Adjust inventory' })
  @ApiOkResponse({ description: 'Inventory adjusted' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiParam({
    name: 'branchId',
    type: String,
    description: 'Branch id (26 chars)',
  })
  async adjust(
    @CurrentUser() user: AuthUser,
    @Param() params: BranchIdParamDto,
    @Body() dto: AdjustInventoryDto,
  ): Promise<StockAdjustmentResult> {
    return this.inventory.adjustStock(
      user.tenantId,
      params.branchId,
      dto.productId,
      dto.quantity,
      dto.notes ?? null,
      user.userId,
      user.role,
    );
  }

  @Post('branches/:branchId/inventory/price-changes')
  @ApiOperation({ summary: 'Change inventory price (per branch)' })
  @ApiOkResponse({ description: 'Price changed' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiParam({
    name: 'branchId',
    type: String,
    description: 'Branch id (26 chars)',
  })
  async changePrice(
    @CurrentUser() user: AuthUser,
    @Param() params: BranchIdParamDto,
    @Body() dto: ChangeInventoryPriceDto,
  ): Promise<PriceChangeResult> {
    return this.inventory.changePrice(
      user.tenantId,
      params.branchId,
      dto.productId,
      dto.price,
      dto.notes ?? null,
      user.userId,
      user.role,
    );
  }

  @Post('branches/:branchId/inventory/transfers')
  @ApiOperation({ summary: 'Transfer inventory between branches' })
  @ApiOkResponse({ description: 'Inventory transferred' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiParam({
    name: 'branchId',
    type: String,
    description: 'From branch id (26 chars)',
  })
  async transfer(
    @CurrentUser() user: AuthUser,
    @Param() params: BranchIdParamDto,
    @Body() dto: TransferInventoryDto,
  ): Promise<StockTransferResult> {
    return this.inventory.transfer(
      user.tenantId,
      params.branchId,
      dto.toBranchId,
      dto.productId,
      dto.quantity,
      user.userId,
      dto.notes ?? null,
    );
  }

  @Get('products/:productId/stock')
  @ApiOperation({ summary: 'Get stock by product (across branches)' })
  @ApiOkResponse({ description: 'Product stock result' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiParam({
    name: 'productId',
    type: String,
    description: 'Product id (26 chars)',
  })
  async getStockByProduct(
    @CurrentUser() user: AuthUser,
    @Param() params: ProductIdParamDto,
  ): Promise<ProductStockResult> {
    return this.inventory.getStockByProduct(user.tenantId, params.productId);
  }
}
