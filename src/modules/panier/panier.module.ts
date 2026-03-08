import { Module } from '@nestjs/common';
import { PanierController } from './panier.controller';

@Module({
  controllers: [PanierController]
})
export class PanierModule {}
