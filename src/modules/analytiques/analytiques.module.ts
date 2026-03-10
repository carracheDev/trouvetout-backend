// src/modules/analytiques/analytiques.module.ts
import { Module } from '@nestjs/common';
import { AnalytiquesController } from './analytiques.controller';
import { AnalytiquesService } from './analytiques.service';

@Module({
  controllers: [AnalytiquesController],
  providers: [AnalytiquesService],
  exports: [AnalytiquesService],
})
export class AnalytiquesModule {}