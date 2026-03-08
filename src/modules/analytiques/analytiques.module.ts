import { Module } from '@nestjs/common';
import { AnalytiquesController } from './analytiques.controller';

@Module({
  controllers: [AnalytiquesController]
})
export class AnalytiquesModule {}
