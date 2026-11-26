import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ContaAtual } from '../autenticacao/decoradores';
import type { ContaDaSessao } from '../autenticacao/sessoes.service';
import { lerArgumentos, type CorpoComArgumentos } from '../comum/argumentos';
import { OperacaoService, texto } from './operacao.service';

// Rotas do dia: Viagens Externas (fila e carros) e Confirmação e Guias. O nome de cada rota diz a ação. O comentário
// diz o nome da função do sistema em Apps Script que ela substitui.
@Controller('operacao')
export class OperacaoController {
  constructor(private readonly operacao: OperacaoService) {}

  // getDadosOperacaoSeMudou
  @Post('dados-do-dia')
  @HttpCode(200)
  dadosDoDia(@Body() corpo: CorpoComArgumentos) {
    const [data, versao] = lerArgumentos(corpo);
    return this.operacao.dadosDoDiaSeMudou(data, versao);
  }

  // salvarViagensAlocadas
  @Post('montar-carros')
  @HttpCode(200)
  montarCarros(@Body() corpo: CorpoComArgumentos, @ContaAtual() conta: ContaDaSessao) {
    return this.operacao.salvarCarros(lerArgumentos(corpo)[0], conta.nome);
  }

  // atualizarCarroAlocado
  @Post('editar-carro')
  @HttpCode(200)
  editarCarro(@Body() corpo: CorpoComArgumentos, @ContaAtual() conta: ContaDaSessao) {
    return this.operacao.editarCarro(lerArgumentos(corpo), conta.nome);
  }

  // estornarViagemAlocada
  @Post('desfazer-carro')
  @HttpCode(200)
  desfazerCarro(@Body() corpo: CorpoComArgumentos, @ContaAtual() conta: ContaDaSessao) {
    return this.operacao.desfazerCarro(lerArgumentos(corpo), conta.nome);
  }

  // cancelarPedidoFila
  @Post('cancelar-pedido')
  @HttpCode(200)
  cancelarPedido(@Body() corpo: CorpoComArgumentos, @ContaAtual() conta: ContaDaSessao) {
    return this.operacao.cancelarPedidoNaFila(lerArgumentos(corpo), conta.nome);
  }

  // desfazerCancelamentoFila
  @Post('desfazer-cancelamento')
  @HttpCode(200)
  desfazerCancelamento(@Body() corpo: CorpoComArgumentos, @ContaAtual() conta: ContaDaSessao) {
    return this.operacao.desfazerCancelamentoNaFila(lerArgumentos(corpo), conta.nome);
  }

  // excluirDemandaManual
  @Post('excluir-pedido-digitado')
  @HttpCode(200)
  excluirPedidoDigitado(@Body() corpo: CorpoComArgumentos, @ContaAtual() conta: ContaDaSessao) {
    return this.operacao.excluirPedidoDigitado(lerArgumentos(corpo), conta.nome);
  }

  // salvarEdicaoPaciente
  @Post('editar-pedido')
  @HttpCode(200)
  editarPedido(@Body() corpo: CorpoComArgumentos, @ContaAtual() conta: ContaDaSessao) {
    return this.operacao.editarPedido(lerArgumentos(corpo), conta.nome);
  }

  // salvarNovaDemandaFila
  @Post('incluir-pedido-digitado')
  @HttpCode(200)
  incluirPedidoDigitado(@Body() corpo: CorpoComArgumentos, @ContaAtual() conta: ContaDaSessao) {
    const dados = (lerArgumentos(corpo)[0] ?? {}) as Record<string, unknown>;
    return this.operacao.salvarPedidoDigitado(dados, '', conta.nome);
  }

  // atualizarDemandaManual(chave, dataBR, dados)
  @Post('atualizar-pedido-digitado')
  @HttpCode(200)
  atualizarPedidoDigitado(@Body() corpo: CorpoComArgumentos, @ContaAtual() conta: ContaDaSessao) {
    const [chave, , dados] = lerArgumentos(corpo);
    return this.operacao.salvarPedidoDigitado((dados ?? {}) as Record<string, unknown>, texto(chave, 100), conta.nome);
  }

  // salvarConfirmacao
  @Post('confirmar-passageiro')
  @HttpCode(200)
  confirmarPassageiro(@Body() corpo: CorpoComArgumentos, @ContaAtual() conta: ContaDaSessao) {
    return this.operacao.salvarConfirmacao(lerArgumentos(corpo), conta.nome);
  }

  // moverPacienteAlocado
  @Post('mover-passageiro')
  @HttpCode(200)
  moverPassageiro(@Body() corpo: CorpoComArgumentos, @ContaAtual() conta: ContaDaSessao) {
    return this.operacao.moverPassageiro(lerArgumentos(corpo), conta.nome);
  }

  // trocarPacienteAlocado
  @Post('trocar-passageiros')
  @HttpCode(200)
  trocarPassageiros(@Body() corpo: CorpoComArgumentos, @ContaAtual() conta: ContaDaSessao) {
    return this.operacao.trocarPassageiros(lerArgumentos(corpo), conta.nome);
  }

  // marcarAvisoEnviado
  @Post('marcar-aviso-enviado')
  @HttpCode(200)
  marcarAvisoEnviado(@Body() corpo: CorpoComArgumentos, @ContaAtual() conta: ContaDaSessao) {
    return this.operacao.marcarAvisoEnviado(lerArgumentos(corpo), conta.nome);
  }
}
