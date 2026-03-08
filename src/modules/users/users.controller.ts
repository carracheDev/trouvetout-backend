// src/modules/users/users.controller.ts
import {
  Controller,
  Get,
  Put,
  Delete,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateVendeurDto } from './dto/update-vendeur.dto';
import { UpdateLivreurDto } from './dto/update-livreur.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleType } from '@prisma/client';
import {
  IsString, IsNumber, IsOptional, IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

class AddAdresseDto {
  @IsString() nom: string;
  @IsString() rue: string;
  @IsString() quartier: string;
  @IsString() ville: string;
  @IsNumber() @Type(() => Number) latitude: number;
  @IsNumber() @Type(() => Number) longitude: number;
  @IsOptional() @IsBoolean() estPrincipale?: boolean;
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  // ─── Profil ────────────────────────────────────────────
  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return this.usersService.getProfile(user.id);
  }

  @Put('profile')
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  // ─── Vendeur ───────────────────────────────────────────
  @Put('vendeur/profile')
  @Roles(RoleType.VENDEUR)
  updateProfilVendeur(
    @CurrentUser() user: any,
    @Body() dto: UpdateVendeurDto,
  ) {
    return this.usersService.updateProfilVendeur(user.id, dto);
  }

  // ─── Livreur ───────────────────────────────────────────
  @Put('livreur/profile')
  @Roles(RoleType.LIVREUR)
  updateProfilLivreur(
    @CurrentUser() user: any,
    @Body() dto: UpdateLivreurDto,
  ) {
    return this.usersService.updateProfilLivreur(user.id, dto);
  }

  // ─── Adresses ──────────────────────────────────────────
  @Get('adresses')
  getAdresses(@CurrentUser() user: any) {
    return this.usersService.getAdresses(user.id);
  }

  @Post('adresses')
  addAdresse(@CurrentUser() user: any, @Body() dto: AddAdresseDto) {
    return this.usersService.addAdresse(user.id, dto);
  }

  @Delete('adresses/:id')
  deleteAdresse(@CurrentUser() user: any, @Param('id') id: string) {
    return this.usersService.deleteAdresse(user.id, id);
  }

  // ─── Favoris ───────────────────────────────────────────
  @Get('favoris')
  getFavoris(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 15,
  ) {
    return this.usersService.getFavoris(user.id, +page, +limit);
  }

  // ─── Historique ────────────────────────────────────────
  @Get('commandes/historique')
  getHistorique(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 15,
  ) {
    return this.usersService.getHistoriqueCommandes(user.id, +page, +limit);
  }

  // ─── Points fidélité ───────────────────────────────────
  @Get('fidelite')
  getPointsFidelite(@CurrentUser() user: any) {
    return this.usersService.getPointsFidelite(user.id);
  }

  // ─── Admin ─────────────────────────────────────────────
  @Get('admin/all')
  @Roles(RoleType.ADMIN)
  getAllUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    return this.usersService.getAllUsers(+page, +limit, search);
  }

  @Put('admin/:id/toggle-status')
  @Roles(RoleType.ADMIN)
  toggleStatus(@Param('id') id: string) {
    return this.usersService.toggleUserStatus(id);
  }
}