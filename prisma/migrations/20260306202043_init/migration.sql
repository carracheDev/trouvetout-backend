-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('CLIENT', 'VENDEUR', 'LIVREUR', 'ADMIN');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "StatutCommande" AS ENUM ('EN_ATTENTE_PAIEMENT', 'PAYEE', 'EN_PREPARATION', 'PRETE', 'EN_LIVRAISON', 'LIVREE', 'ANNULEE', 'REMBOURSEE', 'LITIGE');

-- CreateEnum
CREATE TYPE "StatutLivraison" AS ENUM ('EN_ATTENTE', 'ACCEPTEE', 'EN_ROUTE_VENDEUR', 'COLIS_RECUPERE', 'EN_ROUTE_CLIENT', 'LIVREE', 'ECHEC');

-- CreateEnum
CREATE TYPE "MethodePaiement" AS ENUM ('MTN_MONEY', 'MOOV_MONEY', 'FLOOZ', 'CARTE_BANCAIRE', 'PAYPAL');

-- CreateEnum
CREATE TYPE "StatutPaiement" AS ENUM ('EN_ATTENTE', 'CONFIRME', 'ECHOUE', 'REMBOURSE');

-- CreateEnum
CREATE TYPE "StatutEscrow" AS ENUM ('BLOQUE', 'LIBERE', 'REMBOURSE');

-- CreateEnum
CREATE TYPE "TypePromo" AS ENUM ('POURCENTAGE', 'MONTANT_FIXE');

-- CreateEnum
CREATE TYPE "TypeMessage" AS ENUM ('TEXTE', 'IMAGE', 'LOCALISATION');

-- CreateEnum
CREATE TYPE "TypeNotification" AS ENUM ('COMMANDE', 'LIVRAISON', 'PAIEMENT', 'CHAT', 'PROMOTION', 'SYSTEME');

-- CreateEnum
CREATE TYPE "NiveauFidelite" AS ENUM ('BRONZE', 'ARGENT', 'OR', 'PLATINE');

-- CreateEnum
CREATE TYPE "TypeTransactionPoints" AS ENUM ('GAIN', 'UTILISATION', 'EXPIRATION', 'BONUS');

-- CreateEnum
CREATE TYPE "StatutSignalement" AS ENUM ('EN_ATTENTE', 'TRAITE', 'REJETE');

-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "motDePasse" TEXT,
    "avatar" TEXT,
    "googleId" TEXT,
    "fcmToken" TEXT,
    "estActif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "type" "RoleType" NOT NULL,
    "estActif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profils_vendeurs" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "nomBoutique" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "banniere" TEXT,
    "estVerifie" BOOLEAN NOT NULL DEFAULT false,
    "documentsVerifies" BOOLEAN NOT NULL DEFAULT false,
    "noteMoyenne" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalVentes" INTEGER NOT NULL DEFAULT 0,
    "totalRevenu" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aBoutiqueConfiguree" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profils_vendeurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profils_livreurs" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "numeroCNI" TEXT,
    "photoCNI" TEXT,
    "numeroMobileMoney" TEXT NOT NULL,
    "estVerifie" BOOLEAN NOT NULL DEFAULT false,
    "estDisponible" BOOLEAN NOT NULL DEFAULT false,
    "noteMoyenne" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalLivraisons" INTEGER NOT NULL DEFAULT 0,
    "totalRevenu" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latitudeActuelle" DOUBLE PRECISION,
    "longitudeActuelle" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profils_livreurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adresses" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "rue" TEXT NOT NULL,
    "quartier" TEXT NOT NULL,
    "ville" TEXT NOT NULL DEFAULT 'Cotonou',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "estPrincipale" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icone" TEXT NOT NULL,
    "couleur" TEXT NOT NULL DEFAULT '#2563EB',
    "parentId" TEXT,
    "estActif" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produits" (
    "id" TEXT NOT NULL,
    "vendeurId" TEXT NOT NULL,
    "categorieId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "prix" DOUBLE PRECISION NOT NULL,
    "prixPromo" DOUBLE PRECISION,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "estDisponible" BOOLEAN NOT NULL DEFAULT true,
    "estEnPromo" BOOLEAN NOT NULL DEFAULT false,
    "nombreLikes" INTEGER NOT NULL DEFAULT 0,
    "nombreVentes" INTEGER NOT NULL DEFAULT 0,
    "noteMoyenne" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nombreAvis" INTEGER NOT NULL DEFAULT 0,
    "estSignale" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medias_produits" (
    "id" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "duree" INTEGER,
    "thumbnail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medias_produits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones_livraison" (
    "id" TEXT NOT NULL,
    "vendeurId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "rayonMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rayonMax" DOUBLE PRECISION NOT NULL,
    "prix" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estActif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zones_livraison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "likes" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commentaires" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "estSignale" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commentaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favoris" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favoris_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avis" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "note" INTEGER NOT NULL,
    "commentaire" TEXT,
    "photos" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signalements" (
    "id" TEXT NOT NULL,
    "auteurId" TEXT NOT NULL,
    "produitId" TEXT,
    "commentaireId" TEXT,
    "raison" TEXT NOT NULL,
    "statut" "StatutSignalement" NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signalements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paniers" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paniers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_panier" (
    "id" TEXT NOT NULL,
    "panierId" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lignes_panier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commandes" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "vendeurId" TEXT NOT NULL,
    "adresseId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "statut" "StatutCommande" NOT NULL DEFAULT 'EN_ATTENTE_PAIEMENT',
    "montantTotal" DOUBLE PRECISION NOT NULL,
    "montantLivraison" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "montantCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "noteClient" INTEGER,
    "codePromoId" TEXT,
    "reductionAppliquee" DOUBLE PRECISION,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commandes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_commande" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prixUnitaire" DOUBLE PRECISION NOT NULL,
    "sousTotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "lignes_commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiements" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "methode" "MethodePaiement" NOT NULL,
    "statut" "StatutPaiement" NOT NULL DEFAULT 'EN_ATTENTE',
    "referenceExterne" TEXT,
    "flutterwaveRef" TEXT,
    "donneesWebhook" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paiements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escrows" (
    "id" TEXT NOT NULL,
    "paiementId" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "statut" "StatutEscrow" NOT NULL DEFAULT 'BLOQUE',
    "dateLiberation" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escrows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codes_promo" (
    "id" TEXT NOT NULL,
    "vendeurId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "TypePromo" NOT NULL,
    "valeur" DOUBLE PRECISION NOT NULL,
    "dateExpiration" TIMESTAMP(3) NOT NULL,
    "usagesMax" INTEGER NOT NULL DEFAULT 100,
    "usagesActuels" INTEGER NOT NULL DEFAULT 0,
    "estActif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codes_promo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "livraisons" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "livreurId" TEXT NOT NULL,
    "statut" "StatutLivraison" NOT NULL DEFAULT 'EN_ATTENTE',
    "adresseDepart" TEXT NOT NULL,
    "adresseArrivee" TEXT NOT NULL,
    "latitudeDepart" DOUBLE PRECISION,
    "longitudeDepart" DOUBLE PRECISION,
    "latitudeArrivee" DOUBLE PRECISION,
    "longitudeArrivee" DOUBLE PRECISION,
    "latitudeActuelle" DOUBLE PRECISION,
    "longitudeActuelle" DOUBLE PRECISION,
    "distanceKm" DOUBLE PRECISION,
    "dureeEstimeeMin" INTEGER,
    "montant" DOUBLE PRECISION NOT NULL,
    "photoRecuperation" TEXT,
    "photoLivraison" TEXT,
    "noteClient" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "livraisons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions_gps" (
    "id" TEXT NOT NULL,
    "livreurId" TEXT NOT NULL,
    "livraisonId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "vitesse" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "positions_gps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT,
    "participant1Id" TEXT NOT NULL,
    "participant2Id" TEXT NOT NULL,
    "dernierMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "expediteurId" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "type" "TypeMessage" NOT NULL DEFAULT 'TEXTE',
    "estLu" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "corps" TEXT NOT NULL,
    "type" "TypeNotification" NOT NULL,
    "estLue" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "points_fidelite" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "solde" INTEGER NOT NULL DEFAULT 0,
    "niveau" "NiveauFidelite" NOT NULL DEFAULT 'BRONZE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "points_fidelite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions_points" (
    "id" TEXT NOT NULL,
    "pointsFideliteId" TEXT NOT NULL,
    "commandeId" TEXT,
    "points" INTEGER NOT NULL,
    "type" "TypeTransactionPoints" NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_points_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_email_key" ON "utilisateurs"("email");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_telephone_key" ON "utilisateurs"("telephone");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_googleId_key" ON "utilisateurs"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_utilisateurId_type_key" ON "roles"("utilisateurId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "profils_vendeurs_utilisateurId_key" ON "profils_vendeurs"("utilisateurId");

-- CreateIndex
CREATE UNIQUE INDEX "profils_livreurs_utilisateurId_key" ON "profils_livreurs"("utilisateurId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "likes_utilisateurId_produitId_key" ON "likes"("utilisateurId", "produitId");

-- CreateIndex
CREATE UNIQUE INDEX "favoris_utilisateurId_produitId_key" ON "favoris"("utilisateurId", "produitId");

-- CreateIndex
CREATE UNIQUE INDEX "avis_commandeId_key" ON "avis"("commandeId");

-- CreateIndex
CREATE UNIQUE INDEX "paniers_utilisateurId_key" ON "paniers"("utilisateurId");

-- CreateIndex
CREATE UNIQUE INDEX "lignes_panier_panierId_produitId_key" ON "lignes_panier"("panierId", "produitId");

-- CreateIndex
CREATE UNIQUE INDEX "commandes_numero_key" ON "commandes"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "paiements_commandeId_key" ON "paiements"("commandeId");

-- CreateIndex
CREATE UNIQUE INDEX "escrows_paiementId_key" ON "escrows"("paiementId");

-- CreateIndex
CREATE UNIQUE INDEX "escrows_commandeId_key" ON "escrows"("commandeId");

-- CreateIndex
CREATE UNIQUE INDEX "codes_promo_code_key" ON "codes_promo"("code");

-- CreateIndex
CREATE UNIQUE INDEX "livraisons_commandeId_key" ON "livraisons"("commandeId");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_participant1Id_participant2Id_key" ON "conversations"("participant1Id", "participant2Id");

-- CreateIndex
CREATE UNIQUE INDEX "points_fidelite_utilisateurId_key" ON "points_fidelite"("utilisateurId");

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profils_vendeurs" ADD CONSTRAINT "profils_vendeurs_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profils_livreurs" ADD CONSTRAINT "profils_livreurs_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adresses" ADD CONSTRAINT "adresses_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produits" ADD CONSTRAINT "produits_vendeurId_fkey" FOREIGN KEY ("vendeurId") REFERENCES "profils_vendeurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produits" ADD CONSTRAINT "produits_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medias_produits" ADD CONSTRAINT "medias_produits_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zones_livraison" ADD CONSTRAINT "zones_livraison_vendeurId_fkey" FOREIGN KEY ("vendeurId") REFERENCES "profils_vendeurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commentaires" ADD CONSTRAINT "commentaires_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commentaires" ADD CONSTRAINT "commentaires_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favoris" ADD CONSTRAINT "favoris_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favoris" ADD CONSTRAINT "favoris_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avis" ADD CONSTRAINT "avis_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avis" ADD CONSTRAINT "avis_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avis" ADD CONSTRAINT "avis_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "commandes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signalements" ADD CONSTRAINT "signalements_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signalements" ADD CONSTRAINT "signalements_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signalements" ADD CONSTRAINT "signalements_commentaireId_fkey" FOREIGN KEY ("commentaireId") REFERENCES "commentaires"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paniers" ADD CONSTRAINT "paniers_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_panier" ADD CONSTRAINT "lignes_panier_panierId_fkey" FOREIGN KEY ("panierId") REFERENCES "paniers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_panier" ADD CONSTRAINT "lignes_panier_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_vendeurId_fkey" FOREIGN KEY ("vendeurId") REFERENCES "profils_vendeurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_adresseId_fkey" FOREIGN KEY ("adresseId") REFERENCES "adresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_codePromoId_fkey" FOREIGN KEY ("codePromoId") REFERENCES "codes_promo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_commande" ADD CONSTRAINT "lignes_commande_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "commandes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_commande" ADD CONSTRAINT "lignes_commande_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "commandes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrows" ADD CONSTRAINT "escrows_paiementId_fkey" FOREIGN KEY ("paiementId") REFERENCES "paiements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrows" ADD CONSTRAINT "escrows_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "commandes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codes_promo" ADD CONSTRAINT "codes_promo_vendeurId_fkey" FOREIGN KEY ("vendeurId") REFERENCES "profils_vendeurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livraisons" ADD CONSTRAINT "livraisons_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "commandes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livraisons" ADD CONSTRAINT "livraisons_livreurId_fkey" FOREIGN KEY ("livreurId") REFERENCES "profils_livreurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions_gps" ADD CONSTRAINT "positions_gps_livreurId_fkey" FOREIGN KEY ("livreurId") REFERENCES "profils_livreurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions_gps" ADD CONSTRAINT "positions_gps_livraisonId_fkey" FOREIGN KEY ("livraisonId") REFERENCES "livraisons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant1Id_fkey" FOREIGN KEY ("participant1Id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant2Id_fkey" FOREIGN KEY ("participant2Id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_expediteurId_fkey" FOREIGN KEY ("expediteurId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_fidelite" ADD CONSTRAINT "points_fidelite_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions_points" ADD CONSTRAINT "transactions_points_pointsFideliteId_fkey" FOREIGN KEY ("pointsFideliteId") REFERENCES "points_fidelite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
