// Fluxo 1, de ponta a ponta na API: do arquivo do OLOSTECH à fila do dia (spec 001, cenários de aceite).
import { criarAplicacaoComBanco, csvFicticioDeTeste, ENDERECO_DO_BANCO_DE_TESTE, type AplicacaoComBanco } from './teste/aplicacao-com-banco';

const DIA = '2026-12-01';

describe.skipIf(!ENDERECO_DO_BANCO_DE_TESTE)('fluxo 1: do arquivo do OLOSTECH à fila do dia', () => {
  let c: AplicacaoComBanco;
  beforeAll(async () => {
    c = await criarAplicacaoComBanco();
  });
  afterAll(async () => c?.aplicacao.close());

  it('recusa arquivo vazio ou só com cabeçalho', async () => {
    await c.chamar('/importacao/importar-arquivo', ['']).expect(400);
    await c.chamar('/importacao/importar-arquivo', ['Data compromisso,Cidade\n']).expect(400);
    await c.chamar('/importacao/importar-arquivo', [42]).expect(400);
  });

  it('importa o arquivo, conta os cancelados e lista os locais desconhecidos', async () => {
    const resposta = await c.chamar('/importacao/importar-arquivo', [csvFicticioDeTeste()]).expect(200);
    expect(resposta.body.status).toBe('Sucesso');
    expect(resposta.body.totalLinhas).toBe(16);
    expect(resposta.body.canceladas).toBe(2);
    expect(resposta.body.avisoHeader).toBe('');
    expect(resposta.body.pendencias.length).toBeGreaterThan(0);
  });

  it('reimportar o mesmo arquivo não duplica pedidos', async () => {
    await c.chamar('/importacao/importar-arquivo', [csvFicticioDeTeste()]).expect(200);
    expect(await c.banco.cliente.pedido.count()).toBe(16);
  });

  it('monta a fila do dia sem os pedidos de Joinville e com o cancelado marcado', async () => {
    const { body } = await c.chamar('/operacao/dados-do-dia', [DIA]).expect(200);
    expect(body._dataISO).toBe(DIA);
    expect(body.pacientes.every((p: { cidade: string }) => p.cidade !== 'JOINVILLE')).toBe(true);
    expect(body.pacientes.length).toBe(7);
    expect(body.pacientes.some((p: { cancelado: boolean; canceladoPor: string }) => p.cancelado && p.canceladoPor === 'posto')).toBe(true);
    const semMudanca = await c.chamar('/operacao/dados-do-dia', [DIA, body._versao]).expect(200);
    expect(semMudanca.body).toEqual({ semMudanca: true, _versao: body._versao });
  });

  it('recusa data em formato errado', async () => {
    await c.chamar('/operacao/dados-do-dia', ['01/12/2026']).expect(400);
  });

  it('sugere o local já padronizado da mesma cidade e grava a decisão no dicionário', async () => {
    await c.chamar('/importacao/salvar-decisoes-de-locais', [[
      { cidadeOriginal: 'FLORIANÓPOLIS', localOriginal: 'HOSPITAL REGIONAL DE EXEMPLO', cidadePadrao: 'FLORIANÓPOLIS', localPadrao: 'HOSPITAL REGIONAL DE EXEMPLO' },
      { cidadeOriginal: '', localOriginal: '' },
    ]]).expect(200);
    const { body: sugestoes } = await c.chamar('/importacao/sugestoes-de-locais', [[
      { cidade: 'FLORIANÓPOLIS', local: 'HOSP. REGIONAL DE EXEMPLO' },
      { cidade: 'CURITIBA', local: 'HOSP. REGIONAL DE EXEMPLO' },
      { cidade: 'FLORIANÓPOLIS', local: 'ABC' },
    ]]).expect(200);
    expect(sugestoes[0]).toMatchObject({ fonte: 'dicionario', sugestaoCidade: 'FLORIANÓPOLIS', sugestaoLocal: 'HOSPITAL REGIONAL DE EXEMPLO' });
    expect(sugestoes[1].fonte).toBe('nenhuma');
    expect(sugestoes[2].fonte).toBe('nenhuma');

    const { body: resultado } = await c.chamar('/importacao/salvar-decisoes-de-locais', [[
      { cidadeOriginal: 'FLORIANÓPOLIS', localOriginal: 'HOSP. REGIONAL DE EXEMPLO', cidadePadrao: 'FLORIANÓPOLIS', localPadrao: 'HOSPITAL REGIONAL DE EXEMPLO', origem: 'dicionario' },
    ]]).expect(200);
    expect(resultado.linhasCorrigidas).toBeGreaterThan(0);
    const pedido = await c.banco.cliente.pedido.findFirst({ where: { localOriginal: 'HOSP. REGIONAL DE EXEMPLO' } });
    expect(pedido?.localDestino).toBe('HOSPITAL REGIONAL DE EXEMPLO');
    const { body: pendentes } = await c.chamar('/importacao/locais-pendentes').expect(200);
    expect(pendentes.find((p: { local: string }) => p.local === 'HOSP. REGIONAL DE EXEMPLO')).toBeUndefined();
    const { body: padroes } = await c.chamar('/importacao/locais-padronizados').expect(200);
    expect(padroes.cidades).toContain('FLORIANÓPOLIS');
  });

  it('a próxima importação já sai padronizada', async () => {
    const { body } = await c.chamar('/importacao/importar-arquivo', [csvFicticioDeTeste()]).expect(200);
    expect(body.corrigidas).toBeGreaterThan(0);
  });

  it('cabeçalho fora do padrão importa sem padronizar e avisa', async () => {
    const csv = 'A;B;C;D\n02/12/2026;X;8;Y\n';
    const { body } = await c.chamar('/importacao/importar-arquivo', [csv]).expect(200);
    expect(body.avisoHeader).toContain('fora do padrão');
  });

  it('cancela um pedido na fila, recusa sem justificativa e desfaz o cancelamento', async () => {
    const { body } = await c.chamar('/operacao/dados-do-dia', [DIA]).expect(200);
    const ativo = body.pacientes.find((p: { cancelado: boolean }) => !p.cancelado);
    await c.chamar('/operacao/cancelar-pedido', [DIA, ativo.chaveDemanda, 'Paciente desistiu', '']).expect(400);
    await c.chamar('/operacao/cancelar-pedido', [DIA, '', 'Outro', 'x']).expect(400);
    await c.chamar('/operacao/cancelar-pedido', [DIA, 'D-NAOEXISTE', 'Outro', 'x']).expect(404);
    const cancelado = await c.chamar('/operacao/cancelar-pedido', [DIA, ativo.chaveDemanda, 'Paciente desistiu', 'Ligou avisando']).expect(200);
    expect(cancelado.body.acaoCancelamento).toBe('cancelada');
    const marcado = cancelado.body.pacientes.find((p: { chaveDemanda: string }) => p.chaveDemanda === ativo.chaveDemanda);
    expect(marcado).toMatchObject({ cancelado: true, canceladoNaFila: true, canceladoPor: 'paciente' });
    await c.chamar('/operacao/cancelar-pedido', [DIA, ativo.chaveDemanda, 'Setor', 'De novo']).expect(200);
    const desfeito = await c.chamar('/operacao/desfazer-cancelamento', [DIA, ativo.chaveDemanda]).expect(200);
    expect(desfeito.body.pacientes.find((p: { chaveDemanda: string }) => p.chaveDemanda === ativo.chaveDemanda).cancelado).toBe(false);
    await c.chamar('/operacao/desfazer-cancelamento', [DIA, ativo.chaveDemanda]).expect(409);
  });

  it('inclui, edita e apaga um pedido digitado à mão', async () => {
    const dados = { dataNavegador: DIA, nome: 'PACIENTE DIGITADO FICTÍCIO', cidade: 'Curitiba', hora: '9', local: 'Clínica Fictícia', quantidade: 2, telefones: '(00) 0000-0000' };
    await c.chamar('/operacao/incluir-pedido-digitado', [{ ...dados, nome: '' }]).expect(400);
    await c.chamar('/operacao/incluir-pedido-digitado', [{ ...dados, cidade: '' }]).expect(400);
    const { body } = await c.chamar('/operacao/incluir-pedido-digitado', [dados]).expect(200);
    const digitado = body.pacientes.find((p: { nome: string }) => p.nome === dados.nome);
    expect(digitado).toMatchObject({ origemManual: true, cidade: 'CURITIBA', hora: '09:00', quantidade: 2 });
    // O mesmo compromisso digitado de novo vira um gêmeo, com outra chave.
    await c.chamar('/operacao/incluir-pedido-digitado', [dados]).expect(200);

    const editado = await c.chamar('/operacao/atualizar-pedido-digitado', [digitado.chaveDemanda, '01/12/2026', { ...dados, hora: '10:30' }]).expect(200);
    expect(editado.body.pacientes.some((p: { nome: string; hora: string }) => p.nome === dados.nome && p.hora === '10:30')).toBe(true);
    const importado = body.pacientes.find((p: { origemManual: boolean }) => !p.origemManual);
    await c.chamar('/operacao/atualizar-pedido-digitado', [importado.chaveDemanda, '01/12/2026', dados]).expect(400);

    await c.chamar('/operacao/excluir-pedido-digitado', [importado.chaveDemanda, DIA]).expect(400);
    const novaChave = editado.body.pacientes.find((p: { nome: string; hora: string }) => p.nome === dados.nome && p.hora === '10:30').chaveDemanda;
    expect((await c.chamar('/operacao/excluir-pedido-digitado', [novaChave, DIA]).expect(200)).body).toEqual({ ok: true });
    expect((await c.chamar('/operacao/excluir-pedido-digitado', [novaChave, DIA]).expect(200)).body.ok).toBe(false);

    // Cancelar na fila um pedido digitado apaga o pedido.
    const gemeo = (await c.chamar('/operacao/dados-do-dia', [DIA])).body.pacientes.find((p: { nome: string }) => p.nome === dados.nome);
    const apagado = await c.chamar('/operacao/cancelar-pedido', [DIA, gemeo.chaveDemanda, 'Outro', 'Digitado errado']).expect(200);
    expect(apagado.body.acaoCancelamento).toBe('apagada');
  });

  it('edita local, observação e quantidade de um pedido da fila', async () => {
    const { body } = await c.chamar('/operacao/dados-do-dia', [DIA]);
    const p = body.pacientes[0];
    await c.chamar('/operacao/editar-pedido', ['X1', 'Local', '', 1]).expect(400);
    await c.chamar('/operacao/editar-pedido', ['P999999', 'Local', '', 1]).expect(404);
    expect((await c.chamar('/operacao/editar-pedido', [p.id, 'Local Novo', 'Leva cadeira', 3]).expect(200)).text).toBe('true');
    const depois = (await c.chamar('/operacao/dados-do-dia', [DIA])).body.pacientes.find((x: { id: string }) => x.id === p.id);
    expect(depois).toMatchObject({ local: 'Local Novo', observacao: 'Leva cadeira', quantidade: 3 });
  });

  it('recusa argumentos que não vêm em lista', async () => {
    const request = (await import('supertest')).default;
    await request(c.aplicacao.getHttpServer()).post('/operacao/dados-do-dia').set('Cookie', c.operador).send({ argumentos: 'x' }).expect(400);
  });
});
