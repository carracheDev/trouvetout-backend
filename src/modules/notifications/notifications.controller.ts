// src/modules/notifications/notifications.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  UseGuards,
  Body,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SendNotificationDto, SendMultipleDto } from './dto/notification.dto';
import { RoleType } from '@prisma/client';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  // ─── Mes notifications ─────────────────────────────────
  @Get()
  getMes(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.notificationsService.getMesNotifications(
      user.id,
      +page,
      +limit,
    );
  }

  // ─── Nombre non lues ───────────────────────────────────
  @Get('non-lues')
  getNonLues(@CurrentUser() user: any) {
    return this.notificationsService.getNonLues(user.id);
  }

  // ─── Tout marquer lu ───────────────────────────────────
  @Put('tout-lire')
  toutLire(@CurrentUser() user: any) {
    return this.notificationsService.toutMarquerLu(user.id);
  }

  // ─── Marquer une lue ───────────────────────────────────
  @Put(':id/lire')
  marquerLue(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.marquerLue(id, user.id);
  }

  // ─── Supprimer ─────────────────────────────────────────
  @Delete(':id')
  supprimer(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.supprimer(id, user.id);
  }

  // ─── Admin : envoyer à un user ─────────────────────────
  @Post('envoyer')
  @Roles(RoleType.ADMIN)
  envoyer(@Body() dto: SendNotificationDto) {
    return this.notificationsService.sendToUser(
      dto.userId,
      dto.titre,
      dto.contenu,
      dto.type,
      dto.data,
    );
  }

  // ─── Admin : envoyer à plusieurs ───────────────────────
  @Post('envoyer-multiple')
  @Roles(RoleType.ADMIN)
  envoyerMultiple(@Body() dto: SendMultipleDto) {
    return this.notificationsService.sendToMultiple(
      dto.userIds,
      dto.titre,
      dto.contenu,
      dto.type,
      dto.data,
    );
  }
}