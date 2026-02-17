import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthUser } from '../../../common/auth/auth.types';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { BranchIdParamDto } from './dto/branch-id.param.dto';
import { CartIdParamDto } from './dto/cart-id.param.dto';
import { CheckoutCartDto } from './dto/checkout-cart.dto';
import { CreateCartDto } from './dto/create-cart.dto';
import { ProductIdParamDto } from './dto/product-id.param.dto';
import { SetCartItemQuantityDto } from './dto/set-cart-item-quantity.dto';
import {
  CartsService,
  type CartView,
  type CheckoutResultView,
} from './carts.service';

@UseGuards(JwtAuthGuard)
@Controller('branches/:branchId/carts')
export class CartsController {
  constructor(private readonly carts: CartsService) {}

  @Post()
  async createCart(
    @CurrentUser() user: AuthUser,
    @Param() params: BranchIdParamDto,
    @Body() dto: CreateCartDto,
  ): Promise<CartView> {
    return this.carts.createCart(user, params.branchId, dto);
  }

  @Get(':cartId')
  async getCart(
    @CurrentUser() user: AuthUser,
    @Param() params: BranchIdParamDto & CartIdParamDto,
  ): Promise<CartView> {
    return this.carts.getCart(user, params.branchId, params.cartId);
  }

  @Post(':cartId/items')
  async addItem(
    @CurrentUser() user: AuthUser,
    @Param() params: BranchIdParamDto & CartIdParamDto,
    @Body() dto: AddCartItemDto,
  ): Promise<CartView> {
    return this.carts.addItem(user, params.branchId, params.cartId, dto);
  }

  @Patch(':cartId/items/:productId')
  async setItemQuantity(
    @CurrentUser() user: AuthUser,
    @Param() params: BranchIdParamDto & CartIdParamDto & ProductIdParamDto,
    @Body() dto: SetCartItemQuantityDto,
  ): Promise<CartView> {
    return this.carts.setItemQuantity(
      user,
      params.branchId,
      params.cartId,
      params.productId,
      dto,
    );
  }

  @Delete(':cartId/items/:productId')
  async removeItem(
    @CurrentUser() user: AuthUser,
    @Param() params: BranchIdParamDto & CartIdParamDto & ProductIdParamDto,
  ): Promise<CartView> {
    return this.carts.removeItem(
      user,
      params.branchId,
      params.cartId,
      params.productId,
    );
  }

  @Post(':cartId/checkout')
  async checkout(
    @CurrentUser() user: AuthUser,
    @Param() params: BranchIdParamDto & CartIdParamDto,
    @Body() dto: CheckoutCartDto,
  ): Promise<CheckoutResultView> {
    return this.carts.checkout(user, params.branchId, params.cartId, dto);
  }
}
