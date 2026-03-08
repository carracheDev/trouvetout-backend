// src/modules/panier/panier.controller.ts
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
import { PanierService } from './panier.service';
import { AddPanierDto, UpdateQuantiteDto } from './dto/panier.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('panier')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PanierController {
  constructor(private panierService: PanierService) {}

  @Get()
  getPanier(@CurrentUser() user: any) {
    return this.panierService.getPanier(user.id);
  }

  @Post('items')
  addItem(@CurrentUser() user: any, @Body() dto: AddPanierDto) {
    return this.panierService.addItem(user.id, dto);
  }

  @Put('items/:id')
  updateQuantite(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateQuantiteDto,
  ) {
    return this.panierService.updateQuantite(user.id, id, dto);
  }

  @Delete('items/:id')
  removeItem(@CurrentUser() user: any, @Param('id') id: string) {
    return this.panierService.removeItem(user.id, id);
  }

  @Delete()
  clearPanier(@CurrentUser() user: any) {
    return this.panierService.clearPanier(user.id);
  }
}