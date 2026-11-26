import { Module } from '@nestjs/common';
import { BancoDeDadosModule } from './banco-de-dados/banco-de-dados.module';
import { CadastrosController } from './cadastros/cadastros.controller';
import { CadastrosService } from './cadastros/cadastros.service';
import { EscalaController } from './escala/escala.controller';
import { EscalaService } from './escala/escala.service';
import { ImportacaoController } from './importacao/importacao.controller';
import { ImportacaoService } from './importacao/importacao.service';
import { OperacaoController } from './operacao/operacao.controller';
import { OperacaoService } from './operacao/operacao.service';
import { PrepararDadosIniciaisService } from './inicializacao/preparar-dados-iniciais.service';

// Os três fluxos da entrega: importação, montagem dos carros com a escala e confirmação do paciente (ADR 0008).
@Module({
  imports: [BancoDeDadosModule],
  controllers: [ImportacaoController, OperacaoController, EscalaController, CadastrosController],
  providers: [ImportacaoService, OperacaoService, EscalaService, CadastrosService, PrepararDadosIniciaisService],
})
export class FluxosModule {}
