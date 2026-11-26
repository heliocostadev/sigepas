import {
  chaveDoLocal,
  chaveDoPedido,
  dataParaISO,
  distanciaDeEdicao,
  ehDemandaInterna,
  ehMarcadorNulo,
  escolherSeparador,
  lerCsv,
  normalizarHora,
  normalizarTexto,
  resumirTexto,
  roteiroDoTexto,
  servidorPedeMotorista,
  similaridade,
} from './regras-do-setor';

describe('regras do setor trazidas do Apps Script', () => {
  it('normaliza texto sem acento, em maiúsculas e com espaços simples', () => {
    expect(normalizarTexto('  Florianópolis   Centro ')).toBe('FLORIANOPOLIS CENTRO');
    expect(normalizarTexto(null)).toBe('');
    expect(normalizarTexto(12)).toBe('12');
    expect(chaveDoLocal('Joinville', 'Hemosc')).toBe('JOINVILLE\x1fHEMOSC');
  });

  it.each([
    ['10', '10:00'],
    ['9', '09:00'],
    ['9h30', '09:30'],
    ['930', '09:30'],
    ['1000', '10:00'],
    ['10:00:00', '10:00'],
    ['', '00:00'],
    [undefined, '00:00'],
    ['manhã', '00:00'],
    ['cedo', 'cedo'],
  ])('normaliza a hora %s para %s', (entrada, saida) => {
    expect(normalizarHora(entrada)).toBe(saida);
  });

  it.each([
    ['27 de nov. de 2026', '2026-11-27'],
    ['2026-11-27', '2026-11-27'],
    ['27/11/2026 08:00', '2026-11-27'],
    ['1/2/2026', '2026-02-01'],
    ['31/02/2026', ''],
    ['amanhã', ''],
  ])('lê a data %s como %s', (entrada, saida) => {
    expect(dataParaISO(entrada)).toBe(saida);
  });

  it('reconhece pedido de servidor e quando ele é da remoção interna', () => {
    expect(ehMarcadorNulo('-')).toBe(true);
    expect(ehMarcadorNulo('Não informado')).toBe(true);
    expect(ehMarcadorNulo('Maria')).toBe(false);
    expect(servidorPedeMotorista('Carro sem motorista')).toBe(false);
    expect(servidorPedeMotorista('Carro com Motorista')).toBe(true);
    expect(servidorPedeMotorista('Ambulância')).toBe(true);
    expect(servidorPedeMotorista('VAN')).toBe(true);
    expect(servidorPedeMotorista('Caravana')).toBe(false);
    const base = { cidade: 'Curitiba', matricula: '1', nomePaciente: 'Ana', tipoVeiculo: 'Automóvel' };
    expect(ehDemandaInterna(base)).toBe(false);
    expect(ehDemandaInterna({ ...base, cidade: 'joinville' })).toBe(true);
    expect(ehDemandaInterna({ ...base, matricula: '-', nomePaciente: '-' })).toBe(true);
    expect(ehDemandaInterna({ ...base, matricula: '-', nomePaciente: '-', tipoVeiculo: 'VAN' })).toBe(false);
  });

  it('dá a mesma chave ao mesmo compromisso e outra ao gêmeo', () => {
    const pedido = { data: '2026-12-01', cidade: 'Curitiba', hora: '08:00', localDestino: 'Clínica', objetivo: 'Exame', matricula: '1', nomePaciente: 'Ana', quantidadePessoas: 1 };
    expect(chaveDoPedido(pedido)).toMatch(/^D-[0-9A-F]{8}$/);
    expect(chaveDoPedido({ ...pedido, cidade: 'CURITIBA ' })).toBe(chaveDoPedido(pedido));
    expect(chaveDoPedido(pedido, 2)).toBe(`${chaveDoPedido(pedido)}-2`);
    expect(chaveDoPedido({ ...pedido, hora: '09:00' })).not.toBe(chaveDoPedido(pedido));
    expect(resumirTexto('')).toBe('00001505');
  });

  it('mede semelhança com teto de tamanho', () => {
    expect(distanciaDeEdicao('HEMOSC', 'HEMOSC')).toBe(0);
    expect(distanciaDeEdicao('', 'ABC')).toBe(3);
    expect(distanciaDeEdicao('ABC', '')).toBe(3);
    expect(distanciaDeEdicao('a'.repeat(5000), 'b'.repeat(5000))).toBe(200);
    expect(similaridade('Hospital Regional', 'Hosp. Regional')).toBeGreaterThan(0.7);
    expect(similaridade('', 'x')).toBe(0);
  });

  it('lê CSV com aspas, aspas dobradas, quebra de linha no campo e BOM', () => {
    const conteudo = '﻿a;b\r\n"x;1";"diz ""oi"""\n"linha\nquebrada";z\n\n';
    expect(escolherSeparador(conteudo)).toBe(';');
    expect(escolherSeparador('a,b,c')).toBe(',');
    expect(lerCsv(conteudo, ';')).toEqual([['a', 'b'], ['x;1', 'diz "oi"'], ['linha\nquebrada', 'z']]);
    expect(lerCsv('a,b', ',')).toEqual([['a', 'b']]);
  });

  it('tira Joinville do começo do roteiro', () => {
    expect(roteiroDoTexto('Joinville > Itajaí > Florianópolis')).toEqual(['Itajaí', 'Florianópolis']);
    expect(roteiroDoTexto('')).toEqual([]);
  });
});
