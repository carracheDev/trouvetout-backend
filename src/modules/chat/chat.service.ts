// src/modules/chat/chat.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EnvoyerMessageDto, CreerConversationDto } from './dto/chat.dto';
import { TypeMessage } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ─── Créer ou récupérer conversation ──────────────────
  async creerOuRecupererConversation(
    userId: string,
    dto: CreerConversationDto,
  ) {
    // Vérifier destinataire existe
    const destinataire = await this.prisma.utilisateur.findUnique({
      where: { id: dto.destinataireId },
      select: { id: true, nom: true },
    });

    if (!destinataire) throw new NotFoundException('Destinataire introuvable');
    if (dto.destinataireId === userId) {
      throw new ForbiddenException('Impossible de se parler à soi-même');
    }

    // Chercher conversation existante
    const existante = await this.prisma.conversation.findFirst({
      where: {
        OR: [
          {
            participant1Id: userId,
            participant2Id: dto.destinataireId,
          },
          {
            participant1Id: dto.destinataireId,
            participant2Id: userId,
          },
        ],
      },
      include: {
        participant1: { select: { id: true, nom: true, avatar: true } },
        participant2: { select: { id: true, nom: true, avatar: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (existante) return existante;

    // Créer nouvelle conversation
    const conversation = await this.prisma.conversation.create({
      data: {
        participant1Id: userId,
        participant2Id: dto.destinataireId,
        commandeId: dto.commandeId,
      },
      include: {
        participant1: { select: { id: true, nom: true, avatar: true } },
        participant2: { select: { id: true, nom: true, avatar: true } },
      },
    });

    // Envoyer premier message si fourni
    if (dto.premierMessage) {
      await this.envoyerMessage(userId, {
        conversationId: conversation.id,
        contenu: dto.premierMessage,
        type: TypeMessage.TEXTE,
      });
    }

    return conversation;
  }

  // ─── Mes conversations ─────────────────────────────────
  async getMesConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ participant1Id: userId }, { participant2Id: userId }],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        participant1: { select: { id: true, nom: true, avatar: true } },
        participant2: { select: { id: true, nom: true, avatar: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // Ajouter nombre de messages non lus
    const conversationsEnrichies = await Promise.all(
      conversations.map(async (conv) => {
        const nonLus = await this.prisma.message.count({
          where: {
            conversationId: conv.id,
            estLu: false,
            expediteurId: { not: userId },
          },
        });

        // Interlocuteur
        const interlocuteur =
          conv.participant1Id === userId
            ? conv.participant2
            : conv.participant1;

        return { ...conv, nonLus, interlocuteur };
      }),
    );

    return conversationsEnrichies;
  }

  // ─── Messages d'une conversation ──────────────────────
  async getMessages(conversationId: string, userId: string, page = 1, limit = 30) {
    // Vérifier accès
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ participant1Id: userId }, { participant2Id: userId }],
      },
    });

    if (!conversation) throw new NotFoundException('Conversation introuvable');

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          expediteur: { select: { id: true, nom: true, avatar: true } },
        },
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);

    // Marquer comme lus
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        expediteurId: { not: userId },
        estLu: false,
      },
      data: { estLu: true },
    });

    return {
      data: messages.reverse(),
      total,
      page,
      limit,
    };
  }

  // ─── Envoyer message ───────────────────────────────────
  async envoyerMessage(userId: string, dto: EnvoyerMessageDto) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: dto.conversationId,
        OR: [{ participant1Id: userId }, { participant2Id: userId }],
      },
      include: {
        participant1: { select: { id: true, nom: true } },
        participant2: { select: { id: true, nom: true } },
      },
    });

    if (!conversation) throw new NotFoundException('Conversation introuvable');

    const message = await this.prisma.message.create({
      data: {
        conversationId: dto.conversationId,
        expediteurId: userId,
        contenu: dto.contenu,
        type: dto.type || TypeMessage.TEXTE,
      },
      include: {
        expediteur: { select: { id: true, nom: true, avatar: true } },
      },
    });

    // Mettre à jour dernier message
    await this.prisma.conversation.update({
      where: { id: dto.conversationId },
      data: { dernierMessage: dto.contenu },
    });

    // Notification push au destinataire
    const destinataireId =
      conversation.participant1Id === userId
        ? conversation.participant2Id
        : conversation.participant1Id;

    const expediteurNom =
      conversation.participant1Id === userId
        ? conversation.participant1.nom
        : conversation.participant2.nom;

    await this.notifications.notifNouveauMessage(
      destinataireId,
      expediteurNom,
    );

    return message;
  }

  // ─── Marquer conversation comme lue ───────────────────
  async marquerConversationLue(conversationId: string, userId: string) {
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        expediteurId: { not: userId },
        estLu: false,
      },
      data: { estLu: true },
    });

    return { message: 'Messages lus' };
  }

  // ─── Total messages non lus ────────────────────────────
  async getTotalNonLus(userId: string) {
    const count = await this.prisma.message.count({
      where: {
        estLu: false,
        expediteurId: { not: userId },
        conversation: {
          OR: [{ participant1Id: userId }, { participant2Id: userId }],
        },
      },
    });

    return { nonLus: count };
  }
}