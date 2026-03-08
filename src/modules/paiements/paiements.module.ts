import { Module } from '@nestjs/common';
import { PaiementsController } from './paiements.controller';

@Module({
  controllers: [PaiementsController]
})
export class PaiementsModule {}
