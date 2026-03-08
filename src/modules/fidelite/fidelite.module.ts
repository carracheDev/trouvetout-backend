import { Module } from '@nestjs/common';
import { FideliteController } from './fidelite.controller';

@Module({
  controllers: [FideliteController]
})
export class FideliteModule {}
