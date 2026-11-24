import { Module } from '@nestjs/common';
import { BancoDeDadosService } from './banco-de-dados.service';

@Module({ providers: [BancoDeDadosService], exports: [BancoDeDadosService] })
export class BancoDeDadosModule {}
