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
import { CreateProductAttributeDefinitionDto } from './dto/create-product-attribute-definition.dto';
import { ListProductAttributeDefinitionsQueryDto } from './dto/list-product-attribute-definitions.query.dto';
import { ListProductsQueryDto } from './dto/list-products.query.dto';
import { ProductAttributeDefinitionIdParamDto } from './dto/product-attribute-definition-id.param.dto';
import { ProductIdParamDto } from './dto/product-id.param.dto';
import { UpdateProductAttributeDefinitionDto } from './dto/update-product-attribute-definition.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  type ProductAttributeDefinitionListResult,
  type ProductAttributeDefinitionView,
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

  @Post('attribute-definitions')
  async createAttributeDefinition(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateProductAttributeDefinitionDto,
  ): Promise<ProductAttributeDefinitionView> {
    return this.products.createAttributeDefinition(user.tenantId, dto);
  }

  @Get('attribute-definitions')
  async listAttributeDefinitions(
    @CurrentUser() user: AuthUser,
    @Query() query: ListProductAttributeDefinitionsQueryDto,
  ): Promise<ProductAttributeDefinitionListResult> {
    return this.products.listAttributeDefinitions(user.tenantId, query);
  }

  @Patch('attribute-definitions/:id')
  async updateAttributeDefinition(
    @CurrentUser() user: AuthUser,
    @Param() params: ProductAttributeDefinitionIdParamDto,
    @Body() dto: UpdateProductAttributeDefinitionDto,
  ): Promise<ProductAttributeDefinitionView> {
    return this.products.updateAttributeDefinition(
      user.tenantId,
      params.id,
      dto,
    );
  }

  @Delete('attribute-definitions/:id')
  async removeAttributeDefinition(
    @CurrentUser() user: AuthUser,
    @Param() params: ProductAttributeDefinitionIdParamDto,
  ): Promise<{ deleted: true }> {
    return this.products.removeAttributeDefinition(user.tenantId, params.id);
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
