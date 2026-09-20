import { beforeEach, describe, expect, it } from 'vitest';
import {
  DicionarioDeLocais,
  LIMIAR_SEMELHANCA,
  distanciaEdicao,
  padronizar,
  semelhanca,
  sugerir,
} from './locais.js';

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

  it('entre dois candidatos, vence o mais parecido', () => {
    dicionario.registrar({
      origem: { cidade: 'F', local: 'HOSPITAL REGIONAL SUL' },
      padrao: { cidade: 'F', local: 'HOSPITAL REGIONAL SUL' },
    });
    const s = sugerir({ cidade: 'F', local: 'HOSPITAL REGIONA' }, dicionario);
    expect(s?.destino).toEqual(HOSPITAL);
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
