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

/** Textos reconhecidos como pedido ativo, já normalizados. */
const VALORES_ATIVOS: ReadonlySet<string> = new Set([
  'ATIVO',
  'ATIVA',
  'AGENDADO',
  'AGENDADA',
  'EM ABERTO',
]);

/** Palavras que indicam cancelamento: "CANCELADO", "CANCELADA", "CANCELAMENTO". */
const PALAVRA_CANCELAMENTO = /^CANCELA(DO|DA|MENTO)S?$/;

/** Palavras que negam o que vem depois: "NÃO CANCELADO" não é cancelamento. */
const NEGACOES: ReadonlySet<string> = new Set(['NAO', 'SEM']);

/**
 * Traduz o texto livre do posto para um status conhecido.
 *
 * O texto varia conforme quem preenche: "Cancelado", "CANCELADO PELO POSTO",
 * "cancelada pelo solicitante", "Cancelamento". Por isso o cancelamento é reconhecido pela
 * palavra, e não pela frase inteira.
 *
 * Tudo o que não for reconhecido com segurança vira `Desconhecido` (issue 6). Antes, qualquer
 * texto sem "CANCELA" virava ativo, e assim "SUSPENSO" ou um erro de digitação como
 * "CANCELDO" entravam como pedido ativo sem ninguém perceber. No sentido oposto,
 * "NÃO CANCELADO" contém "CANCELA" e virava cancelamento. Um valor desconhecido fica
 * visível para revisão, em vez de alterar a operação em silêncio.
 */
export function interpretarStatus(texto: string | null | undefined): StatusPedido {
  const valor = normalizarTexto(texto);
  if (!valor) return StatusPedido.Desconhecido;
  if (VALORES_ATIVOS.has(valor)) return StatusPedido.Ativo;

  const palavras = valor.split(' ');
  const posicao = palavras.findIndex((palavra) => PALAVRA_CANCELAMENTO.test(palavra));
  if (posicao === -1) return StatusPedido.Desconhecido;

  const negado = palavras.slice(0, posicao).some((palavra) => NEGACOES.has(palavra));
  return negado ? StatusPedido.Desconhecido : StatusPedido.CanceladoPeloPosto;
}

/** Atalho de leitura para as telas: este pedido foi cancelado pelo posto? */
export function foiCanceladoPeloPosto(status: StatusPedido): boolean {
  return status === StatusPedido.CanceladoPeloPosto;
}
