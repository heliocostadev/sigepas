import { criarAplicacaoComBanco, ENDERECO_DO_BANCO_DE_TESTE, type AplicacaoComBanco } from '../teste/aplicacao-com-banco';

describe.skipIf(!ENDERECO_DO_BANCO_DE_TESTE)('cadastros da tela Configurações', () => {
  let c: AplicacaoComBanco;
  const salvar = (argumentos: unknown[]) => c.chamar('/cadastros/salvar', argumentos, c.gestor);

  beforeAll(async () => {
    c = await criarAplicacaoComBanco();
  });
  afterAll(async () => c?.aplicacao.close());

  it('cadastra, edita, inativa e reativa um veículo', async () => {
    await salvar(['veiculos', 'novo', { placa: 'tst3c01', tipo: 'SPIN', assentos: '6', propriedade: 'Terceirizado' }]).expect(200);
    await salvar(['veiculos', 'novo', { placa: 'TST3C01' }]).expect(409);
    await salvar(['veiculos', 'novo', { placa: '' }]).expect(400);
    await salvar(['veiculos', 'editar', { placa: 'TST3C01', tipo: 'VAN', assentos: 12, propriedade: 'Terceirizado' }, 'TST3C01']).expect(200);
    await salvar(['veiculos', 'editar', { placa: 'X' }, 'NAOEXISTE']).expect(404);
    await salvar(['veiculos', 'alternarStatus', { motivo: 'Manutenção', observacao: 'Pneu' }, 'TST3C01']).expect(200);
    await salvar(['veiculos', 'alternarStatus', { motivo: 'Ativo' }, 'NAOEXISTE']).expect(404);
    await salvar(['veiculos', 'apagar', {}, 'TST3C01']).expect(400);
    let { body } = await c.chamar('/cadastros/dados').expect(200);
    expect(body.veiculos[0]).toMatchObject({ placa: 'TST3C01', tipo: 'VAN', assentos: 12, status: 'Inativo', motivo: 'Manutenção', observacao: 'Pneu' });
    await salvar(['veiculos', 'alternarStatus', { status: 'Ativo' }, 'TST3C01']).expect(200);
    ({ body } = await c.chamar('/cadastros/dados').expect(200));
    expect(body.veiculos[0]).toMatchObject({ status: 'Ativo', motivo: '', observacao: '' });
  });

  it('cadastra motoristas, vincula o carro ao terceirizado e inativa os dois juntos', async () => {
    await salvar(['motoristas', 'novo', { nome: 'MOTORISTA FICTÍCIO UM', vinculo: 'Terceirizado' }]).expect(200);
    await salvar(['motoristas', 'novo', { nome: 'MOTORISTA FICTÍCIO DOIS', vinculo: 'Servidor' }]).expect(200);
    await salvar(['motoristas', 'novo', { nome: 'MOTORISTA FICTÍCIO DOIS' }]).expect(409);
    await salvar(['motoristas', 'novo', { nome: '' }]).expect(400);
    await salvar(['motoristas', 'editar', { nome: 'MOTORISTA FICTÍCIO DOIS', vinculo: 'Servidor', whatsapp: '0000000000' }, 'MOTORISTA FICTÍCIO DOIS']).expect(200);
    await salvar(['motoristas', 'editar', { nome: 'X' }, 'NINGUÉM']).expect(404);
    await salvar(['motoristas', 'alternarStatus', {}, 'NINGUÉM']).expect(404);
    await salvar(['motoristas', 'trocar', {}, 'NINGUÉM']).expect(400);

    const vincular = (argumentos: unknown[]) => c.chamar('/cadastros/vincular-carro-ao-motorista', argumentos, c.gestor);
    await vincular(['', '']).expect(400);
    await vincular(['MOTORISTA FICTÍCIO UM', 'NAOEXISTE']).expect(404);
    await salvar(['veiculos', 'novo', { placa: 'TST3C02', tipo: 'ARGO', assentos: 4, propriedade: 'Público' }]).expect(200);
    await vincular(['MOTORISTA FICTÍCIO UM', 'TST3C02']).expect(400);
    await vincular(['NINGUÉM', 'tst3c01']).expect(404);
    await vincular(['MOTORISTA FICTÍCIO DOIS', 'TST3C01']).expect(400);
    await vincular(['MOTORISTA FICTÍCIO UM', 'tst3c01']).expect(200);
    await salvar(['motoristas', 'novo', { nome: 'MOTORISTA FICTÍCIO TRÊS', vinculo: 'Terceirizado' }]).expect(200);
    await vincular(['MOTORISTA FICTÍCIO TRÊS', 'TST3C01']).expect(409);

    await c.chamar('/cadastros/inativar-com-vinculo', [{}], c.gestor).expect(400);
    await c.chamar('/cadastros/inativar-com-vinculo', [{ placa: 'TST3C01', motorista: 'MOTORISTA FICTÍCIO UM', observacao: 'Contrato encerrado' }], c.gestor).expect(200);
    const { body } = await c.chamar('/cadastros/dados').expect(200);
    expect(body.motoristas.find((m: { nome: string }) => m.nome === 'MOTORISTA FICTÍCIO UM')).toMatchObject({ status: 'Inativo', placaVinculada: 'TST3C01' });
    await vincular(['MOTORISTA FICTÍCIO TRÊS', 'TST3C01']).expect(400);
  });

  it('cuida dos locais de embarque: padrão, endereço do paciente e nomes repetidos', async () => {
    await salvar(['locais', 'novo', { local: '  Secretaria   da Saúde ' }]).expect(200);
    await salvar(['locais', 'novo', { local: 'Endereço do paciente' }]).expect(200);
    await salvar(['locais', 'novo', { local: 'secretaria da saude' }]).expect(409);
    await salvar(['locais', 'novo', { local: '' }]).expect(400);
    await salvar(['locais', 'definirPadrao', {}, 'Secretaria da Saúde']).expect(200);
    await salvar(['locais', 'definirPadrao', {}, 'Endereço do paciente']).expect(400);
    await salvar(['locais', 'alternarStatus', { motivo: 'Obra' }, 'Secretaria da Saúde']).expect(400);
    await salvar(['locais', 'alternarStatus', { motivo: 'Obra' }, 'Endereço do paciente']).expect(400);
    await salvar(['locais', 'editar', { local: 'Casa' }, 'Endereço do paciente']).expect(400);
    await salvar(['locais', 'editar', { local: 'Secretaria Municipal da Saúde' }, 'Secretaria da Saúde']).expect(200);
    await salvar(['locais', 'editar', { local: 'X', motivo: 'Obra' }, 'Secretaria Municipal da Saúde']).expect(400);
    await salvar(['locais', 'novo', { local: 'Terminal Fictício' }]).expect(200);
    await salvar(['locais', 'alternarStatus', { motivo: 'Obra' }, 'Terminal Fictício']).expect(200);
    await salvar(['locais', 'definirPadrao', {}, 'Terminal Fictício']).expect(400);
    await salvar(['locais', 'editar', {}, 'NAOEXISTE']).expect(404);
    await salvar(['locais', 'mover', {}, 'Terminal Fictício']).expect(400);
    await salvar(['outro', 'novo', {}]).expect(400);
    const { body } = await c.chamar('/cadastros/dados').expect(200);
    expect(body.locais.find((l: { padrao: boolean }) => l.padrao).local).toBe('Secretaria Municipal da Saúde');
  });

  it('cadastra feriado e bloco de dias no calendário, edita e exclui o bloco inteiro', async () => {
    const calendario = (argumentos: unknown[]) => c.chamar('/cadastros/salvar-calendario', argumentos, c.gestor);
    await calendario(['novo', { dataInicio: '' }]).expect(400);
    await calendario(['novo', { dataInicio: '2026-12-25', tipo: 'Feriado', descricao: 'Natal' }]).expect(200);
    await calendario(['novo', { dataInicio: '2026-12-25' }]).expect(409);
    await calendario(['novo', { dataInicio: '2027-01-02', dataFim: '2026-12-31', tipo: 'Ponto facultativo', descricao: 'Recesso' }]).expect(200);
    await calendario(['novo', { dataInicio: '2027-01-01', dataFim: '2027-12-01' }]).expect(400);
    await calendario(['editar', { tipo: 'Feriado', descricao: 'Natal (fictício)' }, '25/12/2026']).expect(200);
    await calendario(['editar', {}, '01/01/2030']).expect(404);
    let { body } = await c.chamar('/cadastros/dados').expect(200);
    expect(body.calendario.map((d: { data: string }) => d.data)).toEqual(['25/12/2026', '31/12/2026', '01/01/2027', '02/01/2027']);
    await calendario(['excluir', {}, '01/01/2027']).expect(200);
    await calendario(['excluir', {}, '25/12/2026']).expect(200);
    await calendario(['mover', {}, '25/12/2026']).expect(400);
    ({ body } = await c.chamar('/cadastros/dados').expect(200));
    expect(body.calendario).toEqual([]);
  });

  it('edita e exclui uma padronização de local', async () => {
    await c.chamar('/importacao/salvar-decisoes-de-locais', [[{ cidadeOriginal: 'BLUMENAU', localOriginal: 'CENTRO MODELO' }]]).expect(200);
    const editar = (dados: object) => c.chamar('/cadastros/salvar-padronizacao', [dados], c.gestor);
    await editar({ cidadeOrig: 'BLUMENAU', localOrig: 'CENTRO MODELO', cidadePad: '', localPad: '' }).expect(400);
    await editar({ cidadeOrig: 'X', localOrig: 'Y', cidadePad: 'A', localPad: 'B' }).expect(404);
    const { body } = await editar({ cidadeOrig: 'BLUMENAU', localOrig: 'CENTRO MODELO', cidadePad: 'BLUMENAU', localPad: 'CENTRO DE ESPECIALIDADES MODELO' }).expect(200);
    expect(body[0]).toMatchObject({ localPad: 'CENTRO DE ESPECIALIDADES MODELO', quem: 'Gestora de Teste' });
    expect((await c.chamar('/cadastros/padronizacoes').expect(200)).body.length).toBe(1);
    const depois = await c.chamar('/cadastros/excluir-padronizacao', [{ cidadeOrig: 'BLUMENAU', localOrig: 'CENTRO MODELO' }], c.gestor).expect(200);
    expect(depois.body).toEqual([]);
  });
});
