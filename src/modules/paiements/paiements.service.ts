// src/modules/paiements/paiements.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InitierPaiementDto } from './dto/paiement.dto';
import { StatutPaiement, StatutCommande, StatutEscrow } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class PaiementsService {
  private readonly kkiapayBaseUrl = 'https://api.kkiapay.me/api/v1';
  private readonly kkiapayPrivateKey = process.env.KKIAPAY_PRIVATE_KEY;
  private readonly kkiapaySecretKey = process.env.KKIAPAY_SECRET_KEY;

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ─── Initier un paiement ───────────────────────────────
  async initierPaiement(userId: string, dto: InitierPaiementDto) {
    const commande = await this.prisma.commande.findFirst({
      where: {
        id: dto.commandeId,
        clientId: userId,
        statut: 'EN_ATTENTE_PAIEMENT',
        deletedAt: null,
      },
      include: {
        client: { select: { nom: true, email: true, telephone: true } },
        vendeur: { select: { nomBoutique: true, utilisateurId: true } },
      },
    });

    if (!commande) {
      throw new NotFoundException('Commande introuvable ou déjà payée');
    }

    // Vérifier si paiement déjà existant
    const paiementExistant = await this.prisma.paiement.findUnique({
      where: { commandeId: dto.commandeId },
    });

    if (paiementExistant && paiementExistant.statut === 'CONFIRME') {
      throw new BadRequestException('Cette commande est déjà payée');
    }

    // Créer ou mettre à jour le paiement
    const paiement = paiementExistant
      ? await this.prisma.paiement.update({
          where: { id: paiementExistant.id },
          data: { methode: dto.methode, statut: 'EN_ATTENTE' },
        })
      : await this.prisma.paiement.create({
          data: {
            commandeId: dto.commandeId,
            utilisateurId: userId,
            montant: commande.montantTotal,
            methode: dto.methode,
            statut: 'EN_ATTENTE',
          },
        });

    // Retourner les infos pour initialiser KKiaPay côté Flutter
    return {
      paiementId: paiement.id,
      montant: commande.montantTotal,
      commande: commande.numero,
      client: {
        nom: commande.client.nom,
        email: commande.client.email,
        telephone: commande.client.telephone,
      },
      // Clé publique pour le SDK Flutter
      kkiapayPublicKey: process.env.KKIAPAY_PUBLIC_KEY,
      // Données à passer au SDK KKiaPay
      kkiapayData: {
        amount: Math.round(commande.montantTotal),
        reason: `Commande ${commande.numero} - TrouveTout`,
        name: commande.client.nom,
        email: commande.client.email || '',
        phone: commande.client.telephone || '',
        partnerId: paiement.id,
        sandbox: process.env.NODE_ENV !== 'production',
      },
    };
  }

  // ─── Vérifier transaction KKiaPay ─────────────────────
  async verifierTransaction(transactionId: string) {
    try {
      const response = await fetch(
        `${this.kkiapayBaseUrl}/transactions/${transactionId}/status`,
        {
          headers: {
            'x-private-key': this.kkiapayPrivateKey,
          },
        },
      );

      if (!response.ok) {
        throw new BadRequestException('Erreur vérification KKiaPay');
      }

      return await response.json();
    } catch (error) {
      throw new BadRequestException(
        `Impossible de vérifier la transaction: ${error.message}`,
      );
    }
  }

  // ─── Confirmer paiement (appelé par Flutter après succès SDK) ─
  async confirmerPaiement(
    userId: string,
    paiementId: string,
    transactionId: string,
  ) {
    const paiement = await this.prisma.paiement.findFirst({
      where: { id: paiementId, utilisateurId: userId },
      include: {
        commande: {
          include: {
            vendeur: { select: { utilisateurId: true, nomBoutique: true } },
            client: { select: { nom: true } },
          },
        },
      },
    });

    if (!paiement) throw new NotFoundException('Paiement introuvable');
    if (paiement.statut === 'CONFIRME') {
      return { message: 'Paiement déjà confirmé', paiement };
    }

    // Vérifier avec KKiaPay
    let transactionVerifiee: any = null;
    try {
      transactionVerifiee = await this.verifierTransaction(transactionId);
    } catch {
      // En mode dev/sandbox on accepte sans vérification
      if (process.env.NODE_ENV === 'production') {
        throw new BadRequestException('Impossible de vérifier le paiement');
      }
    }

    const estConfirme =
      process.env.NODE_ENV !== 'production' ||
      transactionVerifiee?.status === 'SUCCESS';

    if (!estConfirme) {
      await this.prisma.paiement.update({
        where: { id: paiementId },
        data: {
          statut: 'ECHOUE',
          referenceExterne: transactionId,
        },
      });
      throw new BadRequestException('Paiement refusé par KKiaPay');
    }

    // Confirmer le paiement en transaction
    await this.prisma.$transaction(async (tx) => {
      // Mettre à jour paiement
      await tx.paiement.update({
        where: { id: paiementId },
        data: {
          statut: 'CONFIRME',
          referenceExterne: transactionId,
          flutterwaveRef: transactionId,
        },
      });

      // Mettre à jour commande
      await tx.commande.update({
        where: { id: paiement.commandeId },
        data: { statut: StatutCommande.PAYEE },
      });

      // Créer escrow (argent bloqué jusqu'à livraison)
      await tx.escrow.create({
        data: {
          paiementId,
          commandeId: paiement.commandeId,
          montant: paiement.montant,
          statut: StatutEscrow.BLOQUE,
        },
      });

      // Points fidélité → 1 point par 100 FCFA
      const points = Math.floor(paiement.montant / 100);
      if (points > 0) {
        const fidelite = await tx.pointsFidelite.findUnique({
          where: { utilisateurId: userId },
        });

        if (fidelite) {
          const nouveauSolde = fidelite.solde + points;
          const niveau = this.calculerNiveau(nouveauSolde);

          await tx.pointsFidelite.update({
            where: { utilisateurId: userId },
            data: { solde: nouveauSolde, niveau },
          });

          await tx.transactionPoints.create({
            data: {
              pointsFideliteId: fidelite.id,
              commandeId: paiement.commandeId,
              points,
              type: 'GAIN',
              description: `Achat commande ${paiement.commande.numero}`,
            },
          });
        }
      }
    });

    // Notifications
    await this.notifications.notifPaiementConfirme(
      userId,
      paiement.commande.vendeur.utilisateurId,
      paiement.commande.numero,
      paiement.montant,
    );

    await this.notifications.notifNouvelleCommande(
      paiement.commande.vendeur.utilisateurId,
      paiement.commande.numero,
    );

    return {
      message: 'Paiement confirmé !',
      commande: paiement.commande.numero,
      montant: paiement.montant,
      points: Math.floor(paiement.montant / 100),
    };
  }

  // ─── Webhook KKiaPay (serveur → serveur) ──────────────
  async handleWebhook(payload: any, signature: string) {
    // Vérifier signature du webhook
    if (process.env.NODE_ENV === 'production') {
      const hash = crypto
        .createHmac('sha256', this.kkiapaySecretKey)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (hash !== signature) {
        throw new BadRequestException('Signature webhook invalide');
      }
    }

    const { transactionId, status, partnerId } = payload;

    if (status !== 'SUCCESS' || !partnerId) return { received: true };

    const paiement = await this.prisma.paiement.findFirst({
      where: { id: partnerId },
    });

    if (!paiement || paiement.statut === 'CONFIRME') {
      return { received: true };
    }

    // Confirmer automatiquement via webhook
    await this.prisma.paiement.update({
      where: { id: partnerId },
      data: {
        statut: 'CONFIRME',
        referenceExterne: transactionId,
        donneesWebhook: payload,
      },
    });

    await this.prisma.commande.update({
      where: { id: paiement.commandeId },
      data: { statut: StatutCommande.PAYEE },
    });

    return { received: true };
  }

  // ─── Libérer escrow (après livraison confirmée) ────────
  async libererEscrow(commandeId: string, userId: string) {
    const commande = await this.prisma.commande.findFirst({
      where: {
        id: commandeId,
        clientId: userId,
        statut: 'LIVREE',
      },
      include: { escrow: true },
    });

    if (!commande) {
      throw new NotFoundException(
        'Commande introuvable ou pas encore livrée',
      );
    }

    if (!commande.escrow || commande.escrow.statut !== 'BLOQUE') {
      throw new BadRequestException('Escrow déjà libéré');
    }

    await this.prisma.escrow.update({
      where: { id: commande.escrow.id },
      data: {
        statut: StatutEscrow.LIBERE,
        dateLiberation: new Date(),
      },
    });

    return { message: 'Paiement libéré au vendeur ✅' };
  }

  // ─── Historique paiements ──────────────────────────────
  async getHistorique(userId: string, page = 1, limit = 15) {
    const skip = (page - 1) * limit;

    const [paiements, total] = await Promise.all([
      this.prisma.paiement.findMany({
        where: { utilisateurId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          commande: {
            select: {
              numero: true,
              statut: true,
              vendeur: { select: { nomBoutique: true } },
            },
          },
        },
      }),
      this.prisma.paiement.count({ where: { utilisateurId: userId } }),
    ]);

    return { data: paiements, total, page, limit };
  }

  // ─── Calculer niveau fidélité ──────────────────────────
  private calculerNiveau(solde: number) {
    if (solde >= 10000) return 'PLATINE';
    if (solde >= 5000) return 'OR';
    if (solde >= 1000) return 'ARGENT';
    return 'BRONZE';
  }
}