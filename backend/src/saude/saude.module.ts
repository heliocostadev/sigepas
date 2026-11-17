import { Module } from '@nestjs/common';
import { BancoDeDadosModule } from '../banco-de-dados/banco-de-dados.module';
import { SaudeController } from './saude.controller';

@Module({ imports: [BancoDeDadosModule], controllers: [SaudeController] })
export class SaudeModule {}
