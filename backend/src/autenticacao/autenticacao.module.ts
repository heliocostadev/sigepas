import { Global, Module } from '@nestjs/common';
import { BancoDeDadosModule } from '../banco-de-dados/banco-de-dados.module';
import { AutenticacaoController } from './autenticacao.controller';
import { SessoesService } from './sessoes.service';

@Global()
@Module({
  imports: [BancoDeDadosModule],
  controllers: [AutenticacaoController],
  providers: [SessoesService],
  exports: [SessoesService],
})
export class AutenticacaoModule {}
