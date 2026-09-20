import { describe, expect, it } from 'vitest';
import { chaveDestino, normalizarTexto } from './texto.js';

describe('normalizarTexto', () => {
  it('tira acento e sobe para maiúsculas', () => {
    expect(normalizarTexto('Florianópolis')).toBe('FLORIANOPOLIS');
  });

  it('colapsa espaço repetido e apara as pontas', () => {
    expect(normalizarTexto('  HOSPITAL   REGIONAL  ')).toBe('HOSPITAL REGIONAL');
  });

  it('trata nulo, indefinido e vazio como texto vazio', () => {
    expect(normalizarTexto(null)).toBe('');
    expect(normalizarTexto(undefined)).toBe('');
    expect(normalizarTexto('   ')).toBe('');
  });

  it('faz três grafias do mesmo hospital colidirem', () => {
    const a = normalizarTexto('Hospital Regional');
    const b = normalizarTexto('HOSPITAL REGIONAL ');
    const c = normalizarTexto('Hospital Régional');
    expect(new Set([a, b, c]).size).toBe(1);
  });
});

describe('chaveDestino', () => {
  it('junta cidade e local numa chave só', () => {
    expect(chaveDestino('São José', 'Clínica A')).toBe('SAO JOSE||CLINICA A');
  });

  it('não confunde destinos com a mesma sequência de palavras', () => {
    expect(chaveDestino('SAO JOSE', 'CLINICA A')).not.toBe(chaveDestino('SAO', 'JOSE CLINICA A'));
  });

  it('cidade vazia ainda produz chave utilizável', () => {
    expect(chaveDestino('', 'LACEN')).toBe('||LACEN');
  });
});
