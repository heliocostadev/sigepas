import { describe, expect, it } from 'vitest';
import { interpretarData, interpretarHora } from './datas.js';

describe('interpretarData — os três formatos que chegam no arquivo', () => {
  it('por extenso, abreviado e com ponto', () => {
    expect(interpretarData('12 de set. de 2026')).toBe('2026-09-12');
  });

  it('por extenso, mês inteiro', () => {
    expect(interpretarData('1 de janeiro de 2026')).toBe('2026-01-01');
  });

  it('ISO', () => {
    expect(interpretarData('2026-09-12')).toBe('2026-09-12');
  });

  it('brasileiro, com um dígito no dia e no mês', () => {
    expect(interpretarData('12/9/2026')).toBe('2026-09-12');
  });

  it('brasileiro com hora colada: a hora é ignorada aqui', () => {
    expect(interpretarData('12/09/2026 14:30')).toBe('2026-09-12');
  });

  it('ISO com hora colada, com segundos', () => {
    expect(interpretarData('2026-09-12 14:30:00')).toBe('2026-09-12');
  });

  it('os três formatos do mesmo dia dão o mesmo resultado', () => {
    const r = new Set([
      interpretarData('12 de set. de 2026'),
      interpretarData('2026-09-12'),
      interpretarData('12/09/2026'),
    ]);
    expect(r.size).toBe(1);
  });
});

describe('interpretarData — o que não é data', () => {
  it.each([
    null,
    undefined,
    '',
    '   ',
    'amanhã',
    '32/09/2026',
    '31/02/2026',
    '12/13/2026',
    // issue 5: texto sobrando depois de uma data válida
    '2026-09-12-99',
    '12/09/2026/lixo',
    '12/09/2026 lixo',
    '12/09/2026 14:30 lixo',
    '12/09/26',
  ])(
    'devolve null para %s',
    (entrada) => {
      expect(interpretarData(entrada)).toBeNull();
    },
  );
});

describe('interpretarHora', () => {
  it.each([
    ['9', '09:00'],
    ['09', '09:00'],
    ['930', '09:30'],
    ['1000', '10:00'],
    ['9:30', '09:30'],
    ['10h', '10:00'],
    ['10h30', '10:30'],
    ['23:59', '23:59'],
  ])('%s vira %s', (entrada, esperado) => {
    expect(interpretarHora(entrada)).toBe(esperado);
  });

  it('vazio devolve null e não se confunde com meia-noite (issue 8)', () => {
    expect(interpretarHora('')).toBeNull();
    expect(interpretarHora('   ')).toBeNull();
    expect(interpretarHora(null)).toBeNull();
    expect(interpretarHora(undefined)).toBeNull();
  });

  it('meia-noite informada continua sendo meia-noite', () => {
    expect(interpretarHora('00:00')).toBe('00:00');
    expect(interpretarHora('0')).toBe('00:00');
  });

  it.each([
    '24:00',
    '10:60',
    'manhã',
    '99999',
    // issue 5: texto sobrando depois de uma hora válida
    '10h30h',
    '10:30:59',
    '9:',
    '10:3',
    '10 30',
  ])('devolve null para %s', (entrada) => {
    expect(interpretarHora(entrada)).toBeNull();
  });
});
