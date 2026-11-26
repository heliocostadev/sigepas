import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ContaAtual } from '../autenticacao/decoradores';
import type { ContaDaSessao } from '../autenticacao/sessoes.service';
import { lerArgumentos, type CorpoComArgumentos } from '../comum/argumentos';
import { EscalaService } from './escala.service';

// Rotas das telas Escala de Viagens e Escala para Enviar.
@Controller('escala')
export class EscalaController {
  constructor(private readonly escala: EscalaService) {}

  // getDadosParaEscala
  @Post('dados-para-formacao')
  @HttpCode(200)
  dadosParaFormacao(@Body() corpo: CorpoComArgumentos) {
    return this.escala.dadosParaEscala(lerArgumentos(corpo)[0]);
  }

  // salvarNovaArquitetura
  @Post('salvar-escala-do-dia')
  @HttpCode(200)
  salvarEscala(@Body() corpo: CorpoComArgumentos, @ContaAtual() conta: ContaDaSessao) {
    return this.escala.salvarEscala(lerArgumentos(corpo)[0], conta.nome);
  }

  // salvarViagensDaFormacao
  @Post('atribuir-motoristas')
  @HttpCode(200)
  atribuirMotoristas(@Body() corpo: CorpoComArgumentos, @ContaAtual() conta: ContaDaSessao) {
    return this.escala.salvarViagensDaFormacao(lerArgumentos(corpo), conta.nome);
  }

  // getEscalaPeriodo
  @Post('escala-do-periodo')
  @HttpCode(200)
  escalaDoPeriodo(@Body() corpo: CorpoComArgumentos) {
    const [inicio, fim] = lerArgumentos(corpo);
    return this.escala.escalaDoPeriodo(inicio, fim);
  }
}
