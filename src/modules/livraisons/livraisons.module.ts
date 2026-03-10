// src/modules/livraisons/livraisons.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { LivraisonsController } from './livraisons.controller';
import { LivraisonsService } from './livraisons.service';
import { LivraisonsGateway } from './livraisons.gateway';
import { NotificationsModule } from '../notifications/notifications.module';
import { ZonesController } from '../zones/zones.controller';
import { ZonesService } from '../zones/zones.service';

@Module({
  imports: [
    NotificationsModule,
    JwtModule.register({ secret: process.env.JWT_SECRET }),
  ],
  controllers: [LivraisonsController, ZonesController],
  providers: [LivraisonsService, LivraisonsGateway, ZonesService],
  exports: [LivraisonsService, LivraisonsGateway],
})
export class LivraisonsModule {}