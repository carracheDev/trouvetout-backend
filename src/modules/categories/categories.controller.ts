// src/modules/categories/categories.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RoleType } from '@prisma/client';
import { CreateCategorieDto, UpdateCategorieDto } from './dto/create-categorie.dto';

@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Public()
  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @Roles(RoleType.ADMIN)
  create(@Body() dto: CreateCategorieDto) {
    return this.categoriesService.create(dto);
  }

  @Put(':id')
  @Roles(RoleType.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateCategorieDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(RoleType.ADMIN)
  delete(@Param('id') id: string) {
    return this.categoriesService.delete(id);
  }

  // ─── Seed catégories de base ───────────────────────────
  @Post('seed')
  @Roles(RoleType.ADMIN)
  seed() {
    return this.categoriesService.seedCategories();
  }
}