import { Module } from '@nestjs/common';
import { EscrowController } from './escrow.controller';

@Module({
  controllers: [EscrowController]
})
export class EscrowModule {}
