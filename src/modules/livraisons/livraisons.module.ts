import { Module } from '@nestjs/common';
import { LivraisonsController } from './livraisons.controller';

@Module({
  controllers: [LivraisonsController]
})
export class LivraisonsModule {}
