// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { FirebaseService } from './firebase/firebase.service';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AnalytiquesModule } from './modules/analytiques/analytiques.module';
import { UploadModule } from './modules/upload/upload.module';
import { ProduitsModule } from './modules/produits/produits.module';
import { PanierModule } from './modules/panier/panier.module';
import { PaiementsModule } from './modules/paiements/paiements.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { LivraisonsModule } from './modules/livraisons/livraisons.module';
import { IaModule } from './modules/ia/ia.module';
import { FideliteModule } from './modules/fidelite/fidelite.module';
import { FeedModule } from './modules/feed/feed.module';
import { EscrowModule } from './modules/escrow/escrow.module';
import { CommandesModule } from './modules/commandes/commandes.module';
import { CategoriesModule } from './modules/categories/categories.module';

@Module({
  imports: [
    // Config globale
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Base de données
    PrismaModule,

    // Firebase
    FirebaseModule,

    // Modules fonctionnels
    AuthModule,
    UsersModule,
    ProduitsModule,
    CategoriesModule,
    FeedModule,
    PanierModule,
    CommandesModule,
    PaiementsModule,
    EscrowModule,
    LivraisonsModule,
    AuthModule,
    NotificationsModule,
    FideliteModule,
    IaModule,
    AnalytiquesModule,
    UploadModule,
    ConfigModule,
  ],
  providers: [FirebaseService],
})
export class AppModule {}