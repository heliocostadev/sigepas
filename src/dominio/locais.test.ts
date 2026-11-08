import { beforeEach, describe, expect, it } from 'vitest';
import {
  DicionarioDeLocais,
  LIMIAR_SEMELHANCA,
  distanciaEdicao,
  padronizar,
  semelhanca,
  sugerir,
} from './locais.js';
import { normalizarTexto } from './texto.js';

const HOSPITAL = { cidade: 'FLORIANOPOLIS', local: 'HOSPITAL REGIONAL' };

let dicionario: DicionarioDeLocais;

beforeEach(() => {
  dicionario = new DicionarioDeLocais([
    { origem: { cidade: 'florianopolis', local: 'hosp. regional' }, padrao: HOSPITAL },
    { origem: { cidade: 'SAO JOSE', local: 'CLINICA DOS OLHOS' }, padrao: { cidade: 'SAO JOSE', local: 'CLINICA DOS OLHOS' } },
  ]);
});

describe('distanciaEdicao', () => {
  it('texto igual tem distância zero', () => {
    expect(distanciaEdicao('LACEN', 'LACEN')).toBe(0);
  });

  it('uma letra a mais é uma edição', () => {
    expect(distanciaEdicao('LACEN', 'LACENN')).toBe(1);
  });

  it('comparar com vazio custa o tamanho do outro', () => {
    expect(distanciaEdicao('', 'LACEN')).toBe(5);
    expect(distanciaEdicao('LACEN', '')).toBe(5);
  });
});

describe('semelhanca', () => {
  it('ignora acento e caixa', () => {
    expect(semelhanca('Hospital Régional', 'HOSPITAL REGIONAL')).toBe(1);
  });

  it('erro de digitação fica acima do limiar', () => {
    expect(semelhanca('HOSPITAL REGIONALL', 'HOSPITAL REGIONAL')).toBeGreaterThanOrEqual(LIMIAR_SEMELHANCA);
  });

  it('lugares diferentes ficam abaixo do limiar', () => {
    expect(semelhanca('HOSPITAL INFANTIL', 'CLINICA DOS OLHOS')).toBeLessThan(LIMIAR_SEMELHANCA);
  });

  it('texto vazio não se parece com nada', () => {
    expect(semelhanca('', 'LACEN')).toBe(0);
  });
});

describe('padronizar — grafia já decidida', () => {
  it('corrige para a grafia oficial e avisa que corrigiu', () => {
    const r = padronizar({ cidade: 'Florianópolis', local: 'Hosp. Regional' }, dicionario);
    expect(r).toEqual({ tipo: 'conhecido', destino: HOSPITAL, corrigido: true });
  });

  it('grafia que já era a oficial não conta como correção', () => {
    const r = padronizar({ cidade: 'SAO JOSE', local: 'CLINICA DOS OLHOS' }, dicionario);
    expect(r.tipo).toBe('conhecido');
    expect(r.tipo === 'conhecido' && r.corrigido).toBe(false);
  });
});

describe('padronizar — grafia nova', () => {
  it('fica pendente, com sugestão, quando há algo parecido', () => {
    const r = padronizar({ cidade: 'FLORIANOPOLIS', local: 'HOSPITAL REGIONALL' }, dicionario);
    expect(r.tipo).toBe('pendente');
    expect(r.tipo === 'pendente' && r.sugestao?.destino).toEqual(HOSPITAL);
  });

  it('fica pendente sem sugestão quando não há nada parecido', () => {
    const r = padronizar({ cidade: 'CURITIBA', local: 'PRONTO ATENDIMENTO NORTE' }, dicionario);
    expect(r).toMatchObject({ tipo: 'pendente', sugestao: null });
  });

  it('o destino original é preservado — a viagem entra mesmo sem revisão (RN-IMP-07)', () => {
    const original = { cidade: 'CURITIBA', local: 'LUGAR NOVO' };
    const r = padronizar(original, dicionario);
    expect(r.destino).toEqual(original);
  });
});

describe('sugerir — os limites', () => {
  it('nome curto demais não recebe sugestão (UPA x UBS seriam 67% parecidos)', () => {
    dicionario.registrar({ origem: { cidade: 'X', local: 'UBS' }, padrao: { cidade: 'X', local: 'UBS' } });
    expect(sugerir({ cidade: 'X', local: 'UPA' }, dicionario)).toBeNull();
  });

  it('dicionário vazio não sugere nada', () => {
    expect(sugerir(HOSPITAL, new DicionarioDeLocais())).toBeNull();
  });

  it('entre dois candidatos da mesma cidade, vence o mais parecido', () => {
    dicionario.registrar({
      origem: { cidade: 'FLORIANOPOLIS', local: 'HOSPITAL REGIONAL SUL' },
      padrao: { cidade: 'FLORIANOPOLIS', local: 'HOSPITAL REGIONAL SUL' },
    });
    const s = sugerir({ cidade: 'FLORIANOPOLIS', local: 'HOSPITAL REGIONA' }, dicionario);
    expect(s?.destino).toEqual(HOSPITAL);
  });
});

describe('sugerir — a cidade não pode mudar (issue 7)', () => {
  it('o exemplo da issue: Hospital Regional de Lages não recebe o de Joinville como sugestão', () => {
    const joinville = { cidade: 'Joinville', local: 'Hospital Regional' };
    const soJoinville = new DicionarioDeLocais([{ origem: joinville, padrao: joinville }]);
    const resultado = padronizar({ cidade: 'Lages', local: 'Hospital Regional' }, soJoinville);
    expect(resultado.tipo).toBe('pendente');
    expect(resultado.tipo === 'pendente' ? resultado.sugestao : 'não pendente').toBeNull();
  });

  it('local parecido em outra cidade não é sugerido', () => {
    expect(sugerir({ cidade: 'CURITIBA', local: 'HOSPITAL REGIONALL' }, dicionario)).toBeNull();
  });

  it('local com o mesmo nome em outra cidade não é sugerido, mesmo com 100% de semelhança', () => {
    expect(sugerir({ cidade: 'JOINVILLE', local: 'HOSPITAL REGIONAL' }, dicionario)).toBeNull();
  });

  it('com o mesmo nome em duas cidades, a sugestão fica na cidade da linha', () => {
    const joinville = { cidade: 'JOINVILLE', local: 'HOSPITAL REGIONAL' };
    dicionario.registrar({ origem: joinville, padrao: joinville });
    const s = sugerir({ cidade: 'Joinville', local: 'HOSPITAL REGIONALL' }, dicionario);
    expect(s?.destino).toEqual(joinville);
  });

  it('a cidade é comparada sem acento e sem diferença de caixa', () => {
    const s = sugerir({ cidade: 'Florianópolis', local: 'HOSPITAL REGIONALL' }, dicionario);
    expect(s?.destino).toEqual(HOSPITAL);
  });

  it('havendo sugestão, a cidade sugerida é sempre a da linha', () => {
    const entradas = [
      { cidade: 'FLORIANOPOLIS', local: 'HOSPITAL REGIONALL' },
      { cidade: 'SAO JOSE', local: 'CLINICA DOS OLHO' },
      { cidade: 'CURITIBA', local: 'HOSPITAL REGIONAL' },
    ];
    for (const entrada of entradas) {
      const s = sugerir(entrada, dicionario);
      if (s) expect(normalizarTexto(s.destino.cidade)).toBe(normalizarTexto(entrada.cidade));
    }
  });
});

describe('DicionarioDeLocais', () => {
  it('a última decisão sobre a mesma grafia vence', () => {
    const novo = { cidade: 'FLORIANOPOLIS', local: 'HOSPITAL REGIONAL LESTE' };
    dicionario.registrar({ origem: { cidade: 'florianopolis', local: 'hosp. regional' }, padrao: novo });
    expect(dicionario.padraoDe({ cidade: 'FLORIANÓPOLIS', local: 'Hosp. Regional' })).toEqual(novo);
  });

  it('destinos oficiais não repetem', () => {
    expect(dicionario.destinosPadrao()).toHaveLength(2);
  });
});
