import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ContaAtual, SoGestor } from '../autenticacao/decoradores';
import type { ContaDaSessao } from '../autenticacao/sessoes.service';
import { lerArgumentos, type CorpoComArgumentos } from '../comum/argumentos';
import { CadastrosService } from './cadastros.service';

// Rotas da tela Configurações. Ler é livre para quem entrou. Alterar cadastro é só do gestor (ADR 0007).
@Controller('cadastros')
export class CadastrosController {
  constructor(private readonly cadastros: CadastrosService) {}

  // getConfigData
  @Post('dados')
  @HttpCode(200)
  dados() {
    return this.cadastros.dadosDasConfiguracoes();
  }

  // salvarConfig
  @SoGestor()
  @Post('salvar')
  @HttpCode(200)
  salvar(@Body() corpo: CorpoComArgumentos, @ContaAtual() conta: ContaDaSessao) {
    return this.cadastros.salvarConfiguracao(lerArgumentos(corpo), conta.nome);
  }

  // inativarComVinculo
  @SoGestor()
  @Post('inativar-com-vinculo')
  @HttpCode(200)
  inativarComVinculo(@Body() corpo: CorpoComArgumentos, @ContaAtual() conta: ContaDaSessao) {
    return this.cadastros.inativarComVinculo(lerArgumentos(corpo)[0], conta.nome);
  }

  // vincularVeiculoMotorista
  @SoGestor()
  @Post('vincular-carro-ao-motorista')
  @HttpCode(200)
  vincular(@Body() corpo: CorpoComArgumentos, @ContaAtual() conta: ContaDaSessao) {
    return this.cadastros.vincularCarroAoMotorista(lerArgumentos(corpo), conta.nome);
  }

  // salvarCalendario
  @SoGestor()
  @Post('salvar-calendario')
  @HttpCode(200)
  salvarCalendario(@Body() corpo: CorpoComArgumentos, @ContaAtual() conta: ContaDaSessao) {
    return this.cadastros.salvarCalendario(lerArgumentos(corpo), conta.nome);
  }

  // getPadronizacaoLocais
  @Post('padronizacoes')
  @HttpCode(200)
  padronizacoes() {
    return this.cadastros.padronizacoes();
  }

  // salvarPadronizacaoLocal
  @SoGestor()
  @Post('salvar-padronizacao')
  @HttpCode(200)
  salvarPadronizacao(@Body() corpo: CorpoComArgumentos, @ContaAtual() conta: ContaDaSessao) {
    return this.cadastros.salvarPadronizacao(lerArgumentos(corpo)[0], conta.nome);
  }

  // excluirPadronizacaoLocal
  @SoGestor()
  @Post('excluir-padronizacao')
  @HttpCode(200)
  excluirPadronizacao(@Body() corpo: CorpoComArgumentos, @ContaAtual() conta: ContaDaSessao) {
    return this.cadastros.excluirPadronizacao(lerArgumentos(corpo)[0], conta.nome);
  }
}
