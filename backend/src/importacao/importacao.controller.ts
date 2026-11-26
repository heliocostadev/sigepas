import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ContaAtual } from '../autenticacao/decoradores';
import type { ContaDaSessao } from '../autenticacao/sessoes.service';
import { lerArgumentos, type CorpoComArgumentos } from '../comum/argumentos';
import { ImportacaoService } from './importacao.service';

// Rotas da tela Importar CSV. O comentário diz a função do sistema em Apps Script que cada uma substitui.
@Controller('importacao')
export class ImportacaoController {
  constructor(private readonly importacao: ImportacaoService) {}

  // processarCSVUpload
  @Post('importar-arquivo')
  @HttpCode(200)
  importarArquivo(@Body() corpo: CorpoComArgumentos, @ContaAtual() conta: ContaDaSessao) {
    return this.importacao.importar(lerArgumentos(corpo)[0], conta.nome);
  }

  // getLocaisPendentes
  @Post('locais-pendentes')
  @HttpCode(200)
  locaisPendentes() {
    return this.importacao.locaisPendentes();
  }

  // getSugestoesLocais
  @Post('sugestoes-de-locais')
  @HttpCode(200)
  sugestoes(@Body() corpo: CorpoComArgumentos) {
    return this.importacao.sugestoes(lerArgumentos(corpo)[0]);
  }

  // getPadroesLocais
  @Post('locais-padronizados')
  @HttpCode(200)
  padroes() {
    return this.importacao.padroes();
  }

  // salvarDecisoesLocais
  @Post('salvar-decisoes-de-locais')
  @HttpCode(200)
  salvarDecisoes(@Body() corpo: CorpoComArgumentos, @ContaAtual() conta: ContaDaSessao) {
    return this.importacao.salvarDecisoes(lerArgumentos(corpo)[0], conta.nome);
  }
}
