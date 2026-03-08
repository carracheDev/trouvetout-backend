// src/modules/produits/produits.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProduitsService } from './produits.service';
import {
  CreateProduitDto,
  UpdateProduitDto,
  FilterProduitDto,
  CreateCommentaireDto,
  CreateAvisDto,
} from './dto/create-produit.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RoleType } from '@prisma/client';
import { IsString } from 'class-validator';

class SignalerDto {
  @IsString()
  raison: string;
}

@Controller('produits')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProduitsController {
  constructor(private produitsService: ProduitsService) {}

  // ─── CRUD Produit ──────────────────────────────────────
  @Post()
  @Roles(RoleType.VENDEUR)
  create(@CurrentUser() user: any, @Body() dto: CreateProduitDto) {
    return this.produitsService.create(user.id, dto);
  }

  @Public()
  @Get()
  findAll(@Query() dto: FilterProduitDto, @CurrentUser() user: any) {
    return this.produitsService.findAll(dto, user?.id);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.produitsService.findOne(id, user?.id);
  }

  @Put(':id')
  @Roles(RoleType.VENDEUR)
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateProduitDto,
  ) {
    return this.produitsService.update(id, user.id, dto);
  }

  @Delete(':id')
  @Roles(RoleType.VENDEUR)
  delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.produitsService.delete(id, user.id);
  }

  // ─── Vendeur : ses produits ────────────────────────────
  @Get('vendeur/mes-produits')
  @Roles(RoleType.VENDEUR)
  mesProduits(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 15,
  ) {
    return this.produitsService.findAll(
      { page: +page, limit: +limit },
      user.id,
    );
  }

  // ─── Social ────────────────────────────────────────────
  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  toggleLike(@Param('id') id: string, @CurrentUser() user: any) {
    return this.produitsService.toggleLike(id, user.id);
  }

  @Post(':id/favori')
  @HttpCode(HttpStatus.OK)
  toggleFavori(@Param('id') id: string, @CurrentUser() user: any) {
    return this.produitsService.toggleFavori(id, user.id);
  }

  @Public()
  @Get(':id/partager')
  partager(@Param('id') id: string) {
    return this.produitsService.partager(id);
  }

  // ─── Commentaires ──────────────────────────────────────
  @Post(':id/commentaires')
  addCommentaire(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: CreateCommentaireDto,
  ) {
    return this.produitsService.addCommentaire(id, user.id, dto);
  }

  @Public()
  @Get(':id/commentaires')
  getCommentaires(
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.produitsService.getCommentaires(id, +page, +limit);
  }

  @Delete('commentaires/:id')
  deleteCommentaire(@Param('id') id: string, @CurrentUser() user: any) {
    return this.produitsService.deleteCommentaire(id, user.id);
  }

  // ─── Avis ──────────────────────────────────────────────
  @Post(':id/avis')
  addAvis(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: CreateAvisDto,
    @Query('commandeId') commandeId: string,
  ) {
    return this.produitsService.addAvis(id, commandeId, user.id, dto);
  }

  @Public()
  @Get(':id/avis')
  getAvis(
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.produitsService.getAvis(id, +page, +limit);
  }

  // ─── Signalement ───────────────────────────────────────
  @Post(':id/signaler')
  signaler(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: SignalerDto,
  ) {
    return this.produitsService.signaler(id, user.id, dto.raison);
  }
}