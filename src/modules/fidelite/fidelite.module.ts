// src/modules/fidelite/fidelite.module.ts
import { Module } from '@nestjs/common';
import { FideliteController } from './fidelite.controller';
import { FideliteService } from './fidelite.service';

@Module({
  controllers: [FideliteController],
  providers: [FideliteService],
  exports: [FideliteService],
})
export class FideliteModule {}