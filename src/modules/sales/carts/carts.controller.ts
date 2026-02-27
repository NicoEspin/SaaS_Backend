import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

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

@ApiTags('Carts')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@UseGuards(JwtAuthGuard)
@Controller('branches/:branchId/carts')
export class CartsController {
  constructor(private readonly carts: CartsService) {}

  @Post()
  @ApiOperation({ summary: 'Create cart (order draft)' })
  @ApiOkResponse({ description: 'Cart created' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiParam({
    name: 'branchId',
    type: String,
    description: 'Branch id (26 chars)',
  })
  async createCart(
    @CurrentUser() user: AuthUser,
    @Param() params: BranchIdParamDto,
    @Body() dto: CreateCartDto,
  ): Promise<CartView> {
    return this.carts.createCart(user, params.branchId, dto);
  }

  @Get(':cartId')
  @ApiOperation({ summary: 'Get cart by id' })
  @ApiOkResponse({ description: 'Cart detail' })
  @ApiNotFoundResponse({ description: 'Cart not found' })
  @ApiParam({
    name: 'branchId',
    type: String,
    description: 'Branch id (26 chars)',
  })
  @ApiParam({ name: 'cartId', type: String, description: 'Cart id (26 chars)' })
  async getCart(
    @CurrentUser() user: AuthUser,
    @Param() params: BranchIdParamDto & CartIdParamDto,
  ): Promise<CartView> {
    return this.carts.getCart(user, params.branchId, params.cartId);
  }

  @Post(':cartId/items')
  @HttpCode(200)
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiOkResponse({ description: 'Cart updated' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiNotFoundResponse({ description: 'Cart not found' })
  @ApiParam({
    name: 'branchId',
    type: String,
    description: 'Branch id (26 chars)',
  })
  @ApiParam({ name: 'cartId', type: String, description: 'Cart id (26 chars)' })
  async addItem(
    @CurrentUser() user: AuthUser,
    @Param() params: BranchIdParamDto & CartIdParamDto,
    @Body() dto: AddCartItemDto,
  ): Promise<CartView> {
    return this.carts.addItem(user, params.branchId, params.cartId, dto);
  }

  @Patch(':cartId/items/:productId')
  @ApiOperation({ summary: 'Set item quantity' })
  @ApiOkResponse({ description: 'Cart updated' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiNotFoundResponse({ description: 'Cart not found' })
  @ApiParam({
    name: 'branchId',
    type: String,
    description: 'Branch id (26 chars)',
  })
  @ApiParam({ name: 'cartId', type: String, description: 'Cart id (26 chars)' })
  @ApiParam({
    name: 'productId',
    type: String,
    description: 'Product id (26 chars)',
  })
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
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiOkResponse({ description: 'Cart updated' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiNotFoundResponse({ description: 'Cart not found' })
  @ApiParam({
    name: 'branchId',
    type: String,
    description: 'Branch id (26 chars)',
  })
  @ApiParam({ name: 'cartId', type: String, description: 'Cart id (26 chars)' })
  @ApiParam({
    name: 'productId',
    type: String,
    description: 'Product id (26 chars)',
  })
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
  @HttpCode(200)
  @ApiOperation({ summary: 'Checkout cart (creates invoice, stock movements)' })
  @ApiOkResponse({ description: 'Checkout result' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiNotFoundResponse({ description: 'Cart not found' })
  @ApiParam({
    name: 'branchId',
    type: String,
    description: 'Branch id (26 chars)',
  })
  @ApiParam({ name: 'cartId', type: String, description: 'Cart id (26 chars)' })
  async checkout(
    @CurrentUser() user: AuthUser,
    @Param() params: BranchIdParamDto & CartIdParamDto,
    @Body() dto: CheckoutCartDto,
  ): Promise<CheckoutResultView> {
    return this.carts.checkout(user, params.branchId, params.cartId, dto);
  }
}
