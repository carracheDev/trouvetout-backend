// src/modules/panier/panier.module.ts
import { Module } from '@nestjs/common';
import { PanierController } from './panier.controller';
import { PanierService } from './panier.service';

@Module({
  controllers: [PanierController],
  providers: [PanierService],
  exports: [PanierService],
})
export class PanierModule {}