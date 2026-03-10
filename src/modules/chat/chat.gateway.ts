// src/modules/chat/chat.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { EnvoyerMessageDto } from './dto/chat.dto';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // userId → socketId
  private usersConnected = new Map<string, string>();

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
  ) {}

  // ─── Connexion ─────────────────────────────────────────
  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      client.data.userId = payload.sub;
      this.usersConnected.set(payload.sub, client.id);

      // Rejoindre sa room personnelle
      client.join(`user_${payload.sub}`);

      console.log(`✅ Chat connecté: ${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  // ─── Déconnexion ───────────────────────────────────────
  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.usersConnected.delete(client.data.userId);
      console.log(`❌ Chat déconnecté: ${client.data.userId}`);
    }
  }

  // ─── Rejoindre conversation ────────────────────────────
  @SubscribeMessage('rejoindre_conversation')
  async rejoindreConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(`conv_${data.conversationId}`);
    client.emit('conversation_rejointe', { conversationId: data.conversationId });
  }

  // ─── Envoyer message ───────────────────────────────────
  @SubscribeMessage('envoyer_message')
  async envoyerMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: EnvoyerMessageDto,
  ) {
    try {
      const userId = client.data.userId;
      if (!userId) return;

      const message = await this.chatService.envoyerMessage(userId, dto);

      // Émettre à tous dans la conversation
      this.server
        .to(`conv_${dto.conversationId}`)
        .emit('nouveau_message', message);

      return { success: true, message };
    } catch (error) {
      client.emit('erreur', { message: error.message });
    }
  }

  // ─── Indicateur de frappe ──────────────────────────────
  @SubscribeMessage('en_train_d_ecrire')
  enTrainDEcrire(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.to(`conv_${data.conversationId}`).emit('interlocuteur_ecrit', {
      userId: client.data.userId,
      conversationId: data.conversationId,
    });
  }

  // ─── Arrêt frappe ──────────────────────────────────────
  @SubscribeMessage('arret_ecriture')
  arretEcriture(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.to(`conv_${data.conversationId}`).emit('interlocuteur_arrete', {
      userId: client.data.userId,
    });
  }

  // ─── Marquer lu ────────────────────────────────────────
  @SubscribeMessage('marquer_lu')
  async marquerLu(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    await this.chatService.marquerConversationLue(data.conversationId, userId);

    client.to(`conv_${data.conversationId}`).emit('messages_lus', {
      conversationId: data.conversationId,
      luPar: userId,
    });
  }

  // ─── Émettre message depuis le service ────────────────
  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user_${userId}`).emit(event, data);
  }
}