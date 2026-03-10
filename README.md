# 🛍️ TrouveTout — API Backend

> **Marketplace sociale locale africaine** — "Le WhatsApp Status qui vend vraiment"  
> Backend complet pour une application de commerce mobile au Bénin (Cotonou)

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)

---

## 📌 À propos du projet

**TrouveTout** est une marketplace mobile-first conçue pour le marché béninois.  
Elle permet à n'importe quel vendeur local de vendre ses produits via une application mobile simple,  
avec paiement mobile money, livraison géolocalisée et chat en temps réel.

### Problème résolu
Au Bénin, la plupart des petits commerçants vendent via WhatsApp Status de façon désorganisée :
- Pas de catalogue structuré
- Paiements non sécurisés
- Pas de suivi de livraison
- Aucune visibilité sur leurs ventes

**TrouveTout** centralise tout ça dans une seule application.

---

## ⚡ Stack technique

| Technologie | Usage |
|---|---|
| **NestJS** | Framework backend (modules, guards, interceptors) |
| **PostgreSQL** | Base de données relationnelle |
| **Prisma ORM** | Modélisation et migrations |
| **Socket.IO** | Chat temps réel + GPS livraison |
| **KKiaPay** | Paiement mobile money (MTN, Moov, Flooz) |
| **Cloudinary** | Stockage images et vidéos produits |
| **Firebase FCM** | Notifications push mobiles |
| **Claude API** | Chatbot IA + analyse produits |
| **JWT** | Authentification (Access + Refresh tokens) |
| **Bcrypt** | Hashage des mots de passe |

---

## 🏗️ Architecture

```
src/
├── modules/
│   ├── auth/            # JWT, Google OAuth, FCM Token
│   ├── users/           # Profils, adresses, favoris
│   ├── upload/          # Cloudinary (images, vidéos)
│   ├── categories/      # Catégories produits
│   ├── produits/        # CRUD + likes + commentaires + avis
│   ├── feed/            # Algorithme 5+4+3+3
│   ├── panier/          # Gestion panier
│   ├── commandes/       # Cycle de vie commande
│   ├── paiements/       # KKiaPay + Escrow
│   ├── livraisons/      # GPS WebSocket + zones
│   ├── chat/            # WebSocket temps réel
│   ├── notifications/   # Firebase FCM
│   ├── fidelite/        # Points, niveaux, leaderboard
│   ├── analytiques/     # Dashboard vendeur + admin
│   └── ia/              # Claude API (chatbot, analyse, prix)
├── common/
│   ├── guards/          # JWT, Roles
│   ├── decorators/      # @CurrentUser, @Roles, @Public
│   ├── filters/         # Exception filter global
│   └── interceptors/    # Transform response
└── prisma/              # Schema + migrations + seed
```

---

## 📦 Modules & Fonctionnalités

### 🔐 Authentification
- Register / Login avec JWT (Access + Refresh tokens)
- Activation boutique vendeur
- Inscription livreur
- Mise à jour FCM token
- Rôles : `CLIENT` | `VENDEUR` | `LIVREUR` | `ADMIN`

### 👤 Utilisateurs
- Profil complet avec avatar Cloudinary
- Gestion multi-adresses avec géolocalisation
- Favoris, historique commandes, points fidélité

### 📸 Upload Cloudinary
- Images produits (simple + multiple)
- Vidéos 30s max
- Avatars utilisateurs

### 🛍️ Produits
- CRUD complet avec médias
- Like / Unlike
- Commentaires et signalements
- Avis avec note (1-5)
- Soft delete

### 🎯 Algorithme Feed
```
Feed = 5 récents + 4 populaires + 3 promos + 3 suivis = 15 produits
```
- Feed par catégorie
- Tendances
- Produits similaires
- Recherche full-text

### 🛒 Panier & Commandes
- Panier persistant par utilisateur
- Création commande depuis panier
- Numérotation automatique `TT-XXXXXXXX`
- Cycle : `EN_ATTENTE_PAIEMENT` → `PAYEE` → `EN_PREPARATION` → `PRETE` → `EN_LIVRAISON` → `LIVREE`
- Stock auto-décrémenté à la commande

### 💳 Paiements KKiaPay
- Initiation paiement (retourne `kkiapayData` pour SDK Flutter)
- Confirmation paiement
- **Système Escrow** — argent bloqué jusqu'à livraison confirmée
- Webhook serveur-à-serveur avec vérification signature HMAC
- Historique paiements

### 🚴 Livraisons GPS
- Zones de livraison vendeur configurables (rayon min/max, prix)
- Calcul automatique frais livraison (formule Haversine)
- WebSocket GPS : position mise à jour en temps réel
- Statuts : `ACCEPTEE` → `EN_ROUTE_VENDEUR` → `COLIS_RECUPERE` → `EN_ROUTE_CLIENT` → `LIVREE`
- Historique positions GPS

### 💬 Chat WebSocket
- Conversations client ↔ vendeur ↔ livreur
- Messages temps réel via Socket.IO
- Indicateur de frappe
- Marquage lu / non lu
- Notifications push automatiques

### 🔔 Notifications FCM
- Push notifications Firebase
- Types : `COMMANDE` | `LIVRAISON` | `PAIEMENT` | `CHAT` | `SYSTEME`
- Nettoyage automatique tokens invalides
- Helpers métier : `notifNouvelleCommande`, `notifPaiementConfirme`, etc.

### 🎁 Fidélité
- **1 point par 100 FCFA** dépensé
- Niveaux : `BRONZE` → `ARGENT` (1000pts) → `OR` (5000pts) → `PLATINE` (10000pts)
- Avantages par niveau (livraison gratuite, accès anticipé, cashback...)
- Utilisation points comme réduction (100pts = 100 FCFA)
- Leaderboard public
- Transactions traçables

### 🤖 IA — Claude API
- **Chatbot produit** : assistant commercial contextuel, historique conversation
- **Analyse produit vendeur** : score 0-100, points forts, conseils (JSON structuré)
- **Suggestion de prix** : basée sur produits similaires en base + stratégie
- **Génération description** : courte + longue + mots-clés SEO

### 📊 Analytiques Vendeur
- Dashboard : CA aujourd'hui / ce mois / total + variations
- Évolution ventes : graphique par jour (7j / 30j / 90j)
- Top produits par chiffre d'affaires
- Alertes stock faible (< 5 unités)
- Analyse clients : taux fidélité, panier moyen, top clients
- Dashboard admin : stats globales + commissions plateforme

---

## 🚀 Installation

### Prérequis
- Node.js 18+
- PostgreSQL 14+
- Compte Cloudinary
- Compte KKiaPay
- Projet Firebase
- Clé API Anthropic (Claude)

### Étapes

```bash
# 1. Cloner le repo
git clone https://github.com/carracheDev/trouvetout-backend
cd trouvetout-backend

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Remplir toutes les variables dans .env

# 4. Créer la base de données et appliquer les migrations
npx prisma migrate deploy

# 5. Générer le client Prisma
npx prisma generate

# 6. Seeder la base (admin + catégories)
npx prisma db seed

# 7. Démarrer en développement
npm run start:dev
```

L'API sera disponible sur : `http://localhost:3000/api/v1`

---

## 🔧 Variables d'environnement

```env
# Base de données
DATABASE_URL="postgresql://user:password@localhost:5432/trouvetout"

# JWT
JWT_SECRET="votre_secret_jwt"
JWT_REFRESH_SECRET="votre_secret_refresh"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Cloudinary
CLOUDINARY_CLOUD_NAME="votre_cloud_name"
CLOUDINARY_API_KEY="votre_api_key"
CLOUDINARY_API_SECRET="votre_api_secret"

# KKiaPay
KKIAPAY_PUBLIC_KEY="votre_cle_publique"
KKIAPAY_PRIVATE_KEY="votre_cle_privee"
KKIAPAY_SECRET_KEY="votre_cle_secrete"

# Firebase
FIREBASE_PROJECT_ID="votre_project_id"
FIREBASE_CLIENT_EMAIL="votre_client_email"
FIREBASE_PRIVATE_KEY="votre_private_key"

# Anthropic (Claude AI)
ANTHROPIC_API_KEY="votre_cle_anthropic"

# App
PORT=3000
NODE_ENV=development
```

---

## 📡 Endpoints principaux

### Auth
```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/activer-boutique
POST   /auth/devenir-livreur
GET    /auth/me
```

### Produits
```
GET    /produits              # Feed public
POST   /produits              # Créer (vendeur)
GET    /produits/:id          # Détail
PUT    /produits/:id          # Modifier (vendeur)
DELETE /produits/:id          # Supprimer (vendeur)
POST   /produits/:id/like     # Like/Unlike
```

### Commandes
```
POST   /commandes             # Créer depuis panier
GET    /commandes/mes-commandes
GET    /commandes/vendeur
PATCH  /commandes/:id/statut
```

### Paiements
```
POST   /paiements/initier
POST   /paiements/confirmer
POST   /paiements/webhook/kkiapay
POST   /paiements/escrow/:commandeId/liberer
```

### WebSocket — Chat (`/chat`)
```
rejoindre_conversation  → { conversationId }
envoyer_message         → { conversationId, contenu }
en_train_d_ecrire       → { conversationId }
nouveau_message         ← { message }
```

### WebSocket — GPS (`/livraisons`)
```
rejoindre_livraison     → { livraisonId }
position_gps            → { livraisonId, latitude, longitude }
update_statut           → { livraisonId, statut }
position_mise_a_jour    ← { latitude, longitude, timestamp }
```

### IA
```
POST   /ia/chat               # Chatbot (public)
POST   /ia/analyser-produit   # Analyse vendeur
POST   /ia/suggerer-prix      # Suggestion prix
POST   /ia/generer-description
```

---

## 🏦 Règles métier

| Règle | Valeur |
|---|---|
| Commission plateforme | **8%** par commande |
| Escrow | Argent bloqué jusqu'à livraison confirmée |
| Vidéo produit max | **30 secondes** |
| Produits gratuits max | **10 par vendeur** |
| Points fidélité | **1 point / 100 FCFA** |
| Conversion points | **100 pts = 100 FCFA** |

---

## 📊 Schéma base de données

**22 tables** :
`utilisateurs` · `roles` · `profils_vendeurs` · `profils_livreurs` · `adresses` · `categories` · `produits` · `medias_produits` · `zones_livraison` · `likes` · `commentaires` · `favoris` · `avis` · `signalements` · `paniers` · `lignes_panier` · `commandes` · `lignes_commande` · `paiements` · `escrows` · `codes_promo` · `livraisons` · `positions_gps` · `conversations` · `messages` · `notifications` · `points_fidelite` · `transactions_points`

---

## 👨‍💻 Auteur

**Daagbo** — Développeur Full Stack (Flutter · NestJS · Next.js)  
📍 Cotonou, Bénin  
🔗 [GitHub](https://github.com/ton-username)

---

## 📄 Licence

MIT — Libre d'utilisation avec attribution.