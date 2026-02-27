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
import {
  CategoriesService,
  type CategoryListResult,
  type CategoryView,
} from './categories.service';
import { CategoryIdParamDto } from './dto/category-id.param.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ListCategoriesQueryDto } from './dto/list-categories.query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('Categories')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create category' })
  @ApiCreatedResponse({ description: 'Category created' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiConflictResponse({ description: 'Category name already exists' })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryView> {
    return this.categories.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List categories' })
  @ApiOkResponse({ description: 'Categories list' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListCategoriesQueryDto,
  ): Promise<CategoryListResult> {
    return this.categories.list(user.tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by id' })
  @ApiOkResponse({ description: 'Category detail' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiParam({ name: 'id', type: String, description: 'Category id (26 chars)' })
  async getById(
    @CurrentUser() user: AuthUser,
    @Param() params: CategoryIdParamDto,
  ): Promise<CategoryView> {
    return this.categories.getById(user.tenantId, params.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update category' })
  @ApiOkResponse({ description: 'Category updated' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiConflictResponse({ description: 'Category name already exists' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiParam({ name: 'id', type: String, description: 'Category id (26 chars)' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param() params: CategoryIdParamDto,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryView> {
    return this.categories.update(user.tenantId, params.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete category' })
  @ApiOkResponse({ description: 'Category deleted' })
  @ApiConflictResponse({ description: 'Category has products' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiParam({ name: 'id', type: String, description: 'Category id (26 chars)' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param() params: CategoryIdParamDto,
  ): Promise<{ deleted: true }> {
    return this.categories.remove(user.tenantId, params.id);
  }

  @Get(':id/attribute-definitions')
  @ApiOperation({ summary: 'List attribute definitions for a category' })
  @ApiOkResponse({ description: 'Attribute definitions list' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiParam({ name: 'id', type: String, description: 'Category id (26 chars)' })
  async listAttributeDefinitions(
    @CurrentUser() user: AuthUser,
    @Param() params: CategoryIdParamDto,
  ): Promise<{ items: CategoryView['attributeDefinitions'] }> {
    return this.categories.listAttributeDefinitions(user.tenantId, params.id);
  }
}
