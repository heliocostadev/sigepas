import { describe, expect, it } from 'vitest';
import {
  StatusPedido,
  acharColunaStatus,
  foiCanceladoPeloPosto,
  interpretarStatus,
} from './statusPedido.js';

describe('acharColunaStatus', () => {
  it('acha a coluna pelo nome, onde quer que ela esteja', () => {
    expect(acharColunaStatus(['Data', 'Cidade', 'Status do pedido', 'Local'])).toBe(2);
  });

  it('acha mesmo com acento, caixa diferente e espaço sobrando', () => {
    expect(acharColunaStatus(['Data', '  STATUS  '])).toBe(1);
  });

  it('sobrevive à mudança de ordem das colunas do arquivo de origem', () => {
    const antes = ['Data', 'Status do pedido', 'Cidade'];
    const depois = ['Cidade', 'Data', 'Status do pedido'];
    expect(antes[acharColunaStatus(antes)]).toBe(depois[acharColunaStatus(depois)]);
  });

  it('devolve -1 quando a coluna não existe', () => {
    expect(acharColunaStatus(['Data', 'Cidade'])).toBe(-1);
  });

  it('devolve -1 para cabeçalho vazio', () => {
    expect(acharColunaStatus([])).toBe(-1);
  });
});

describe('interpretarStatus', () => {
  it.each(['Cancelado', 'CANCELADO PELO POSTO', 'cancelada pelo solicitante', 'Cancelamento'])(
    '"%s" é cancelamento',
    (texto) => {
      expect(interpretarStatus(texto)).toBe(StatusPedido.CanceladoPeloPosto);
    },
  );

  it.each(['Ativo', 'Agendado', 'Em aberto'])('"%s" é pedido ativo', (texto) => {
    expect(interpretarStatus(texto)).toBe(StatusPedido.Ativo);
  });

  it('vazio é desconhecido, não ativo — a diferença importa para o relatório', () => {
    expect(interpretarStatus('')).toBe(StatusPedido.Desconhecido);
    expect(interpretarStatus(null)).toBe(StatusPedido.Desconhecido);
  });
});

describe('foiCanceladoPeloPosto', () => {
  it('só o cancelamento responde verdadeiro', () => {
    expect(foiCanceladoPeloPosto(StatusPedido.CanceladoPeloPosto)).toBe(true);
    expect(foiCanceladoPeloPosto(StatusPedido.Ativo)).toBe(false);
    expect(foiCanceladoPeloPosto(StatusPedido.Desconhecido)).toBe(false);
  });
});
