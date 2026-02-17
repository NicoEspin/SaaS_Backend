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

import { CurrentUser } from '../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import type { AuthUser } from '../common/auth/auth.types';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products.query.dto';
import { ProductIdParamDto } from './dto/product-id.param.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  ProductsService,
  type ProductListResult,
  type ProductView,
} from './products.service';

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateProductDto,
  ): Promise<ProductView> {
    return this.products.create(user.tenantId, dto);
  }

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListProductsQueryDto,
  ): Promise<ProductListResult> {
    return this.products.list(user.tenantId, query);
  }

  @Get(':id')
  async getById(
    @CurrentUser() user: AuthUser,
    @Param() params: ProductIdParamDto,
  ): Promise<ProductView> {
    return this.products.getById(user.tenantId, params.id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param() params: ProductIdParamDto,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductView> {
    return this.products.update(user.tenantId, params.id, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthUser,
    @Param() params: ProductIdParamDto,
  ): Promise<{ deleted: true }> {
    return this.products.remove(user.tenantId, params.id);
  }
}
