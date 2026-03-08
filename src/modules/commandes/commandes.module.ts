import { Module } from '@nestjs/common';
import { CommandesController } from './commandes.controller';

@Module({
  controllers: [CommandesController]
})
export class CommandesModule {}
