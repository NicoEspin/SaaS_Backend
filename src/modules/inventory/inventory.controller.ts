import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthUser } from '../../common/auth/auth.types';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { BranchIdParamDto } from './dto/branch-id.param.dto';
import { ListBranchInventoryQueryDto } from './dto/list-branch-inventory.query.dto';
import { ProductIdParamDto } from './dto/product-id.param.dto';
import { TransferInventoryDto } from './dto/transfer-inventory.dto';
import {
  InventoryService,
  type BranchInventoryListResult,
  type ProductStockResult,
  type StockAdjustmentResult,
  type StockTransferResult,
} from './inventory.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('branches/:branchId/inventory')
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
    );
  }

  @Post('branches/:branchId/inventory/transfers')
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
  async getStockByProduct(
    @CurrentUser() user: AuthUser,
    @Param() params: ProductIdParamDto,
  ): Promise<ProductStockResult> {
    return this.inventory.getStockByProduct(user.tenantId, params.productId);
  }
}
