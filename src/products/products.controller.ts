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

@ApiTags('Products')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create product' })
  @ApiCreatedResponse({ description: 'Product created' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiConflictResponse({ description: 'Product code already exists' })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateProductDto,
  ): Promise<ProductView> {
    return this.products.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List products' })
  @ApiOkResponse({ description: 'Products list' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'name', required: false, type: String })
  @ApiQuery({ name: 'code', required: false, type: String })
  @ApiQuery({ name: 'categoryName', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListProductsQueryDto,
  ): Promise<ProductListResult> {
    return this.products.list(user.tenantId, query);
  }

  @Post('attribute-definitions')
  @ApiOperation({ summary: 'Create product attribute definition' })
  @ApiCreatedResponse({ description: 'Attribute definition created' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiConflictResponse({
    description: 'Attribute key already exists for this category',
  })
  async createAttributeDefinition(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateProductAttributeDefinitionDto,
  ): Promise<ProductAttributeDefinitionView> {
    return this.products.createAttributeDefinition(user.tenantId, dto);
  }

  @Get('attribute-definitions')
  @ApiOperation({ summary: 'List product attribute definitions' })
  @ApiOkResponse({ description: 'Attribute definitions list' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  async listAttributeDefinitions(
    @CurrentUser() user: AuthUser,
    @Query() query: ListProductAttributeDefinitionsQueryDto,
  ): Promise<ProductAttributeDefinitionListResult> {
    return this.products.listAttributeDefinitions(user.tenantId, query);
  }

  @Patch('attribute-definitions/:id')
  @ApiOperation({ summary: 'Update product attribute definition' })
  @ApiOkResponse({ description: 'Attribute definition updated' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiConflictResponse({
    description: 'Attribute key already exists for this category',
  })
  @ApiNotFoundResponse({ description: 'Attribute definition not found' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Definition id (26 chars)',
  })
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
  @ApiOperation({ summary: 'Delete product attribute definition' })
  @ApiOkResponse({ description: 'Attribute definition deleted' })
  @ApiNotFoundResponse({ description: 'Attribute definition not found' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Definition id (26 chars)',
  })
  async removeAttributeDefinition(
    @CurrentUser() user: AuthUser,
    @Param() params: ProductAttributeDefinitionIdParamDto,
  ): Promise<{ deleted: true }> {
    return this.products.removeAttributeDefinition(user.tenantId, params.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by id' })
  @ApiOkResponse({ description: 'Product detail' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiParam({ name: 'id', type: String, description: 'Product id (26 chars)' })
  async getById(
    @CurrentUser() user: AuthUser,
    @Param() params: ProductIdParamDto,
  ): Promise<ProductView> {
    return this.products.getById(user.tenantId, params.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update product' })
  @ApiOkResponse({ description: 'Product updated' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiConflictResponse({ description: 'Product code already exists' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiParam({ name: 'id', type: String, description: 'Product id (26 chars)' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param() params: ProductIdParamDto,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductView> {
    return this.products.update(user.tenantId, params.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete product' })
  @ApiOkResponse({ description: 'Product deleted' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiParam({ name: 'id', type: String, description: 'Product id (26 chars)' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param() params: ProductIdParamDto,
  ): Promise<{ deleted: true }> {
    return this.products.remove(user.tenantId, params.id);
  }
}
