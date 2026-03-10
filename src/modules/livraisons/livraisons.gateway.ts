// src/modules/livraisons/livraisons.gateway.ts
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
import { JwtService } from '@nestjs/jwt';
import { LivraisonsService } from './livraisons.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/livraisons',
})
export class LivraisonsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private livraisonsService: LivraisonsService,
    private jwtService: JwtService,
  ) {}

  // ─── Connexion ─────────────────────────────────────────
  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) { client.disconnect(); return; }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      client.data.userId = payload.sub;
      client.data.roles = payload.roles;
      client.join(`user_${payload.sub}`);

      console.log(`✅ GPS connecté: ${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ GPS déconnecté: ${client.data?.userId}`);
  }

  // ─── Livreur rejoint une livraison ────────────────────
  @SubscribeMessage('rejoindre_livraison')
  async rejoindre(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { livraisonId: string },
  ) {
    client.join(`livraison_${data.livraisonId}`);
    client.emit('livraison_rejointe', { livraisonId: data.livraisonId });
  }

  // ─── Livreur envoie sa position GPS ───────────────────
  @SubscribeMessage('position_gps')
  async updatePosition(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      livraisonId: string;
      latitude: number;
      longitude: number;
      vitesse?: number;
    },
  ) {
    try {
      const userId = client.data.userId;
      if (!userId) return;

      const position = await this.livraisonsService.updatePosition(
        data.livraisonId,
        userId,
        {
          latitude: data.latitude,
          longitude: data.longitude,
          vitesse: data.vitesse,
        },
      );

      // Broadcast position à tous (client + vendeur) dans la room
      this.server
        .to(`livraison_${data.livraisonId}`)
        .emit('position_mise_a_jour', {
          livraisonId: data.livraisonId,
          ...position,
          timestamp: new Date(),
        });
    } catch (error) {
      client.emit('erreur', { message: error.message });
    }
  }

  // ─── Mettre à jour statut ──────────────────────────────
  @SubscribeMessage('update_statut')
  async updateStatut(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      livraisonId: string;
      statut: string;
      photo?: string;
    },
  ) {
    try {
      const userId = client.data.userId;
      if (!userId) return;

      const livraison = await this.livraisonsService.updateStatut(
        data.livraisonId,
        userId,
        { statut: data.statut as any, photo: data.photo },
      );

      // Notifier tous dans la room
      this.server
        .to(`livraison_${data.livraisonId}`)
        .emit('statut_mis_a_jour', {
          livraisonId: data.livraisonId,
          statut: livraison.statut,
          timestamp: new Date(),
        });

      return { success: true };
    } catch (error) {
      client.emit('erreur', { message: error.message });
    }
  }

  // ─── Émettre depuis service ────────────────────────────
  emitToLivraison(livraisonId: string, event: string, data: any) {
    this.server.to(`livraison_${livraisonId}`).emit(event, data);
  }
}