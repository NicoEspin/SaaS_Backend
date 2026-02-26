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
import {
  CategoriesService,
  type CategoryListResult,
  type CategoryView,
} from './categories.service';
import { CategoryIdParamDto } from './dto/category-id.param.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ListCategoriesQueryDto } from './dto/list-categories.query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryView> {
    return this.categories.create(user.tenantId, dto);
  }

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListCategoriesQueryDto,
  ): Promise<CategoryListResult> {
    return this.categories.list(user.tenantId, query);
  }

  @Get(':id')
  async getById(
    @CurrentUser() user: AuthUser,
    @Param() params: CategoryIdParamDto,
  ): Promise<CategoryView> {
    return this.categories.getById(user.tenantId, params.id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param() params: CategoryIdParamDto,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryView> {
    return this.categories.update(user.tenantId, params.id, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthUser,
    @Param() params: CategoryIdParamDto,
  ): Promise<{ deleted: true }> {
    return this.categories.remove(user.tenantId, params.id);
  }

  @Get(':id/attribute-definitions')
  async listAttributeDefinitions(
    @CurrentUser() user: AuthUser,
    @Param() params: CategoryIdParamDto,
  ): Promise<{ items: CategoryView['attributeDefinitions'] }> {
    return this.categories.listAttributeDefinitions(user.tenantId, params.id);
  }
}
