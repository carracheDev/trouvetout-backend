// src/modules/chat/chat.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { EnvoyerMessageDto, CreerConversationDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('chat')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  // ─── Mes conversations ─────────────────────────────────
  @Get('conversations')
  getMesConversations(@CurrentUser() user: any) {
    return this.chatService.getMesConversations(user.id);
  }

  // ─── Total non lus ─────────────────────────────────────
  @Get('non-lus')
  getNonLus(@CurrentUser() user: any) {
    return this.chatService.getTotalNonLus(user.id);
  }

  // ─── Créer ou récupérer conversation ──────────────────
  @Post('conversations')
  creerConversation(
    @CurrentUser() user: any,
    @Body() dto: CreerConversationDto,
  ) {
    return this.chatService.creerOuRecupererConversation(user.id, dto);
  }

  // ─── Messages d'une conversation ──────────────────────
  @Get('conversations/:id/messages')
  getMessages(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 30,
  ) {
    return this.chatService.getMessages(id, user.id, +page, +limit);
  }

  // ─── Envoyer message (HTTP fallback) ──────────────────
  @Post('messages')
  envoyerMessage(@CurrentUser() user: any, @Body() dto: EnvoyerMessageDto) {
    return this.chatService.envoyerMessage(user.id, dto);
  }

  // ─── Marquer conversation lue ──────────────────────────
  @Post('conversations/:id/lire')
  marquerLue(@Param('id') id: string, @CurrentUser() user: any) {
    return this.chatService.marquerConversationLue(id, user.id);
  }
}