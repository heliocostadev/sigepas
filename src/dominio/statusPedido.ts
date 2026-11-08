/**
 * Status do pedido vindo do posto de saúde (RN-IMP-08 e RN-IMP-09).
 *
 * História real, que explica o desenho: até 28/08 a importação DESCARTAVA o pedido
 * cancelado. Parecia certo — pedido cancelado não vira viagem. Só que o cancelamento
 * costuma chegar DEPOIS de o carro estar montado, e aí não sobrava nenhum vestígio:
 * o motorista saía para buscar um paciente que havia cancelado.
 *
 * Desde então o pedido cancelado ENTRA, marcado. Esconder é decisão de quem exibe, não
 * de quem importa. Este módulo existe para que essa decisão seja tomada uma vez só.
 */

import { normalizarTexto } from './texto.js';

export const StatusPedido = {
  Ativo: 'ATIVO',
  CanceladoPeloPosto: 'CANCELADO_PELO_POSTO',
  Desconhecido: 'DESCONHECIDO',
} as const;

export type StatusPedido = (typeof StatusPedido)[keyof typeof StatusPedido];

/**
 * Localiza a coluna de status pelo CABEÇALHO, nunca por posição.
 *
 * ⚠️ Isto não é preciosismo: a ordem das colunas do arquivo é decidida por um sistema de
 * terceiros e já mudou. Uma posição fixa funcionaria até o dia da mudança, e falharia em
 * silêncio — importando todo mundo como ativo, inclusive quem cancelou.
 *
 * Devolve -1 quando não encontra.
 */
export function acharColunaStatus(cabecalho: readonly string[]): number {
  return cabecalho.findIndex((coluna) => normalizarTexto(coluna).includes('STATUS'));
}

/**
 * Traduz o texto livre do posto para um status conhecido.
 *
 * O texto varia conforme quem preenche: "Cancelado", "CANCELADO PELO POSTO",
 * "cancelada pelo solicitante". Por isso o teste é por conteúdo, não por igualdade.
 */
export function interpretarStatus(texto: string | null | undefined): StatusPedido {
  const valor = normalizarTexto(texto);

  if (!valor) return StatusPedido.Desconhecido;
  // "CANCELA" e não "CANCELAD": o posto também escreve "Cancelamento", que o prefixo
  // mais longo deixava passar como pedido ATIVO — o pior erro possível aqui.
  if (valor.includes('CANCELA')) return StatusPedido.CanceladoPeloPosto;
  return StatusPedido.Ativo;
}

/** Atalho de leitura para as telas: este pedido foi cancelado pelo posto? */
export function foiCanceladoPeloPosto(status: StatusPedido): boolean {
  return status === StatusPedido.CanceladoPeloPosto;
}
