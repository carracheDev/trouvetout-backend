// src/modules/notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from '../../firebase/firebase.service';
import { TypeNotification } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private firebase: FirebaseService,
  ) {}

  // ─── Envoyer notification à un utilisateur ─────────────
  async sendToUser(
    userId: string,
    titre: string,
    corps: string,
    type: TypeNotification,
    data?: Record<string, string>,
  ) {
    // Sauvegarder en base
    const notif = await this.prisma.notification.create({
      data: { utilisateurId: userId, titre, corps, type, data: data || {} },
    });

    // Récupérer le token FCM
    const user = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    // Envoyer via Firebase si token disponible
    if (user?.fcmToken) {
      try {
        await this.firebase.firebaseApp
          .messaging()
          .send({
            token: user.fcmToken,
            notification: { title: titre, body: corps },
            data: data || {},
            android: {
              notification: {
                channelId: 'trouvetout',
                priority: 'high',
                sound: 'default',
              },
            },
            apns: {
              payload: {
                aps: { sound: 'default', badge: 1 },
              },
            },
          });
      } catch (error) {
        // Token invalide → on le supprime
        if (
          error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered'
        ) {
          await this.prisma.utilisateur.update({
            where: { id: userId },
            data: { fcmToken: null },
          });
        }
        console.error('FCM error:', error.message);
      }
    }

    return notif;
  }

  // ─── Envoyer à plusieurs utilisateurs ─────────────────
  async sendToMultiple(
    userIds: string[],
    titre: string,
    contenu: string,
    type: TypeNotification,
    data?: Record<string, string>,
  ) {
    const results = await Promise.allSettled(
      userIds.map((id) => this.sendToUser(id, titre, contenu, type, data)),
    );

    const success = results.filter((r) => r.status === 'fulfilled').length;
    return { envoye: success, total: userIds.length };
  }

  // ─── Mes notifications ─────────────────────────────────
  async getMesNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total, nonLues] = await Promise.all([
      this.prisma.notification.findMany({
        where: { utilisateurId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { utilisateurId: userId } }),
      this.prisma.notification.count({
        where: { utilisateurId: userId, estLue: false },
      }),
    ]);

    return { data: notifications, total, nonLues, page, limit };
  }

  // ─── Marquer comme lue ─────────────────────────────────
  async marquerLue(notifId: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notifId, utilisateurId: userId },
      data: { estLue: true },
    });
    return { message: 'Notification lue' };
  }

  // ─── Tout marquer comme lu ─────────────────────────────
  async toutMarquerLu(userId: string) {
    await this.prisma.notification.updateMany({
      where: { utilisateurId: userId, estLue: false },
      data: { estLue: true },
    });
    return { message: 'Toutes les notifications lues' };
  }

  // ─── Supprimer notification ────────────────────────────
  async supprimer(notifId: string, userId: string) {
    await this.prisma.notification.deleteMany({
      where: { id: notifId, utilisateurId: userId },
    });
    return { message: 'Notification supprimée' };
  }

  // ─── Nombre non lues ───────────────────────────────────
  async getNonLues(userId: string) {
    const count = await this.prisma.notification.count({
      where: { utilisateurId: userId, estLue: false },
    });
    return { nonLues: count };
  }

  // ────────────────────────────────────────────────────────
  // Helpers métier — appelés par les autres services
  // ────────────────────────────────────────────────────────

  // Nouvelle commande → vendeur
  async notifNouvelleCommande(vendeurUserId: string, commandeNumero: string) {
    return this.sendToUser(
      vendeurUserId,
      '🛍️ Nouvelle commande !',
      `Commande ${commandeNumero} reçue. Préparez-la rapidement.`,
      TypeNotification.COMMANDE,
      { type: 'nouvelle_commande', numero: commandeNumero },
    );
  }

  // Statut commande → client
  async notifStatutCommande(
    clientId: string,
    commandeNumero: string,
    statut: string,
  ) {
    const messages: Record<string, string> = {
      EN_PREPARATION: `Votre commande ${commandeNumero} est en préparation 📦`,
      PRETE: `Votre commande ${commandeNumero} est prête pour la livraison ✅`,
      EN_LIVRAISON: `Votre commande ${commandeNumero} est en route 🚴`,
      LIVREE: `Votre commande ${commandeNumero} a été livrée 🎉`,
      ANNULEE: `Votre commande ${commandeNumero} a été annulée ❌`,
    };

    const message = messages[statut] || `Commande ${commandeNumero} : ${statut}`;

    return this.sendToUser(
      clientId,
      '📦 Commande mise à jour',
      message,
      TypeNotification.COMMANDE,
      { type: 'statut_commande', numero: commandeNumero, statut },
    );
  }

  // Paiement confirmé → client et vendeur
  async notifPaiementConfirme(
    clientId: string,
    vendeurUserId: string,
    commandeNumero: string,
    montant: number,
  ) {
    await Promise.all([
      this.sendToUser(
        clientId,
        '✅ Paiement confirmé !',
        `Votre paiement de ${montant.toLocaleString()}F pour ${commandeNumero} est confirmé.`,
        TypeNotification.PAIEMENT,
        { type: 'paiement_confirme', numero: commandeNumero },
      ),
      this.sendToUser(
        vendeurUserId,
        '💰 Paiement reçu !',
        `Paiement de ${montant.toLocaleString()}F reçu pour ${commandeNumero}.`,
        TypeNotification.PAIEMENT,
        { type: 'paiement_recu', numero: commandeNumero },
      ),
    ]);
  }

  // Nouveau message → destinataire
  async notifNouveauMessage(destinataireId: string, expediteurNom: string) {
    return this.sendToUser(
      destinataireId,
      `💬 Message de ${expediteurNom}`,
      'Vous avez un nouveau message',
      TypeNotification.CHAT,
      { type: 'nouveau_message' },
    );
  }

  // Nouveau like → vendeur
  async notifNouveauLike(vendeurUserId: string, produitNom: string) {
    return this.sendToUser(
      vendeurUserId,
      '❤️ Nouveau like !',
      `Quelqu'un a aimé "${produitNom}"`,
      TypeNotification.SYSTEME,
      { type: 'nouveau_like' },
    );
  }
}