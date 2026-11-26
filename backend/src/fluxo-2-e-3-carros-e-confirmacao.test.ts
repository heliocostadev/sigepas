// Fluxos 2 e 3, de ponta a ponta na API: do pedido ao carro escalado, e a confirmação do paciente por telefone.
import { criarAplicacaoComBanco, csvFicticioDeTeste, ENDERECO_DO_BANCO_DE_TESTE, type AplicacaoComBanco } from './teste/aplicacao-com-banco';

const DIA = '2026-12-01';
type Paciente = { id: string; chaveDemanda: string; matricula: string; nome: string; quantidade: number; cancelado: boolean; cidade: string };
type Carro = { idViagem: string; placa: string; horaEmbarque: string; passageiros: { matricula: string; statusConfirmacao: string; obsLigacao: string; enderecoEmbarque: string }[] };

describe.skipIf(!ENDERECO_DO_BANCO_DE_TESTE)('fluxos 2 e 3: carros, escala e confirmação', () => {
  let c: AplicacaoComBanco;
  let pacientes: Paciente[];

  const dadosDoDia = async () => (await c.chamar('/operacao/dados-do-dia', [DIA]).expect(200)).body;
  const carro = (dados: { veiculosSalvos: Carro[] }, placa: string) => dados.veiculosSalvos.find((v) => v.placa === placa) as Carro;
  const passageiro = (p: Paciente) => ({ ...p, quantidade: 1 });

  beforeAll(async () => {
    c = await criarAplicacaoComBanco({ semearDadosFicticios: true });
    const { PrepararDadosIniciaisService } = await import('./inicializacao/preparar-dados-iniciais.service');
    await c.aplicacao.get(PrepararDadosIniciaisService).preparar();
    await c.chamar('/importacao/importar-arquivo', [csvFicticioDeTeste()]).expect(200);
    pacientes = (await dadosDoDia()).pacientes.filter((p: Paciente) => !p.cancelado);
  });
  afterAll(async () => c?.aplicacao.close());

  it('os cadastros fictícios estão na tela de Configurações', async () => {
    const { body } = await c.chamar('/cadastros/dados').expect(200);
    expect(body.veiculos.length).toBe(8);
    expect(body.motoristas.length).toBe(8);
    expect(body.locais.find((l: { trava: string }) => l.trava === 'sentinela')).toBeTruthy();
  });

  it('forma a escala do dia e a frota disponível', async () => {
    const { body: formacao } = await c.chamar('/escala/dados-para-formacao', [DIA]).expect(200);
    expect(formacao.servidores.length).toBe(6);
    expect(formacao.terceirizados[0].placaVinculada).toBe('TST2B01');
    expect(formacao.contexto).toMatchObject({ ehUtil: true, ehAncora: true });
    const motoristas = formacao.servidores.map((m: { nome: string }, i: number) => ({ data: DIA, nome: m.nome, vinculo: 'Servidor', condicao: i === 5 ? 'Ausente' : 'Disponível', motivo: i === 5 ? 'Férias' : '', posicao: i + 1 }));
    const veiculos = ['TST1A01', 'TST1A02', 'TST1A03', 'TST1A04'].map((placa) => ({ data: DIA, placa, propriedade: 'Público', condicao: 'Disponível', motivo: '' }));
    const { body } = await c.chamar('/escala/salvar-escala-do-dia', [{ motoristas, veiculos }]).expect(200);
    expect(body.datas).toEqual(['01/12/2026']);
    const dados = await dadosDoDia();
    expect(dados.motoristasDisponiveis.length).toBe(5);
    expect(dados.veiculos.map((v: { placa: string }) => v.placa)).toEqual(['TST1A01', 'TST1A02', 'TST1A03', 'TST1A04']);
    expect(dados.embarquePadrao).toBe('Secretaria da Saúde');
  });

  it('no fim de semana a escala vale para o bloco inteiro de dias não úteis', async () => {
    const { body } = await c.chamar('/escala/dados-para-formacao', ['2026-12-05']).expect(200);
    expect(body.contexto).toMatchObject({ ehUtil: false, ehAncora: true, dias: ['05/12/2026', '06/12/2026'] });
    const salvo = await c.chamar('/escala/salvar-escala-do-dia', [{ motoristas: [{ data: '2026-12-05', nome: 'CARLOS TESTE PEREIRA', vinculo: 'Servidor', condicao: 'Disponível', posicao: 1 }], veiculos: [] }]).expect(200);
    expect(salvo.body.datas).toEqual(['05/12/2026', '06/12/2026']);
    const domingo = (await c.chamar('/escala/dados-para-formacao', ['2026-12-06']).expect(200)).body.contexto;
    expect(domingo).toMatchObject({ ehAncora: false, ancora: '05/12/2026', ancoraTemEscala: true });
  });

  it('monta dois carros e tira os pedidos da fila', async () => {
    const [a, b, d] = pacientes as [Paciente, Paciente, Paciente];
    const montar = [{
      data: DIA,
      alocacoes: [
        { placa: 'TST1A01', tipo: 'SPIN', motorista: 'ANTÔNIO FICTÍCIO DA SILVA', horaEmbarque: '05:00', localEmbarque: 'Secretaria da Saúde', destino: a.cidade, roteiro: [a.cidade], bloqueados: 0, passageiros: [passageiro(a), passageiro(b)], aviso: 'Levar a ficha' },
        { placa: 'TST1A02', tipo: 'SPIN', motorista: 'BEATRIZ EXEMPLO SOUZA', horaEmbarque: '06:00', localEmbarque: 'Terminal Central', destino: d.cidade, passageiros: [passageiro(d)], doisMotoristas: true },
        { placa: 'TST1A06', tipo: 'FURGÃO LACEN', motorista: 'CARLOS TESTE PEREIRA', horaEmbarque: '07:00', destino: 'FLORIANÓPOLIS', passageiros: [] },
      ],
    }];
    expect((await c.chamar('/operacao/montar-carros', montar).expect(200)).text).toBe('true');
    const dados = await dadosDoDia();
    expect(dados.veiculosSalvos.length).toBe(3);
    expect(carro(dados, 'TST1A01')).toMatchObject({ horaEmbarque: '05:00', aviso: 'Levar a ficha', avisoAEnviar: true });
    expect(carro(dados, 'TST1A02')).toMatchObject({ doisMotoristas: true });
    expect(dados.pacientes.find((p: Paciente) => p.chaveDemanda === a.chaveDemanda)).toBeUndefined();
    expect(dados.motoristasDisponiveis).not.toContain('ANTÔNIO FICTÍCIO DA SILVA');
  });

  it('recusa o mesmo pedido em dois carros, o mesmo carro no mesmo horário e o carro lotado', async () => {
    const [a, , , e, f] = pacientes as Paciente[] as [Paciente, Paciente, Paciente, Paciente, Paciente];
    const tentar = (alocacao: object) => c.chamar('/operacao/montar-carros', [{ data: DIA, alocacoes: [alocacao] }]);
    expect((await tentar({ placa: 'TST1A03', horaEmbarque: '08:00', passageiros: [passageiro(a)] }).expect(409)).body.message).toContain('já está em outro carro');
    expect((await tentar({ placa: 'TST1A01', horaEmbarque: '05:00', passageiros: [passageiro(e)] }).expect(409)).body.message).toContain('já sai às 05:00');
    expect((await tentar({ placa: 'TST1A01', horaEmbarque: '', passageiros: [passageiro(e)] }).expect(409)).body.message).toContain('Informe a hora');
    expect((await tentar({ placa: 'TST1A05', horaEmbarque: '09:00', passageiros: [{ ...e, quantidade: 2 }, { ...f, quantidade: 1 }] }).expect(400)).body.message).toContain('Não cabe');
    expect((await tentar({ placa: 'TST2B01', horaEmbarque: '09:00', doisMotoristas: true, passageiros: [passageiro(e)] }).expect(400)).body.message).toContain('carro público');
  });

  it('confirma o paciente por telefone (fluxo 3) e a confirmação some se a hora de saída mudar', async () => {
    const [a] = pacientes as [Paciente];
    await c.chamar('/operacao/confirmar-passageiro', [DIA, 'TST1A01', a.matricula, 'Talvez', 'Paciente', '']).expect(400);
    await c.chamar('/operacao/confirmar-passageiro', [DIA, 'TST1A01', '000', 'Confirmado', 'Paciente', '']).expect(404);
    const confirmado = await c.chamar('/operacao/confirmar-passageiro', [DIA, 'TST1A01', a.matricula, 'Confirmado', 'Mãe', 'Vai de muleta']).expect(200);
    const p = carro(confirmado.body, 'TST1A01').passageiros.find((x) => x.matricula === a.matricula);
    expect(p).toMatchObject({ statusConfirmacao: 'Confirmado', quemAtendeu: 'Mãe', observacao: 'Vai de muleta' });

    const naoConfirmado = await c.chamar('/operacao/confirmar-passageiro', [DIA, 'TST1A01', pacientes[1]?.matricula, 'Não atende', 'Ninguém atendeu']).expect(200);
    expect(carro(naoConfirmado.body, 'TST1A01').passageiros.find((x) => x.matricula === pacientes[1]?.matricula)?.statusConfirmacao).toBe('Não atende');

    const mudou = await c.chamar('/operacao/editar-carro', [DIA, 'TST1A01', { horaSaida: '05:30', localEmbarque: 'Terminal Central', bloqueados: 1, embarques: { [a.matricula]: 'Rua Fictícia, 1' } }, '', '']).expect(200);
    const depois = carro(mudou.body, 'TST1A01').passageiros.find((x) => x.matricula === a.matricula);
    expect(depois).toMatchObject({ statusConfirmacao: 'Pendente', enderecoEmbarque: 'Rua Fictícia, 1' });
    expect(depois?.obsLigacao).toContain('saída mudou de 05:00 para 05:30');
  });

  it('edita o carro: aviso, dois motoristas, encaixe e retirada de passageiro', async () => {
    const [a, b, , e] = pacientes as [Paciente, Paciente, Paciente, Paciente];
    await c.chamar('/operacao/editar-carro', [DIA, 'TST9X99', {}, '', '']).expect(404);
    await c.chamar('/operacao/editar-carro', [DIA, 'TST1A06', { encaixar: [passageiro(e)] }, '', '']).expect(400);
    await c.chamar('/operacao/editar-carro', [DIA, 'TST2B01', {}, '', '']).expect(404);
    await c.chamar('/operacao/editar-carro', [DIA, 'TST1A01', { doisMotoristas: true }, '', '']).expect(200);
    const comEncaixe = await c.chamar('/operacao/editar-carro', [DIA, 'TST1A01', { aviso: '', roteiro: ['CURITIBA', 'FLORIANÓPOLIS'], encaixar: [passageiro(e)], removerMatriculas: [b.matricula] }, '', '']).expect(200);
    const v = carro(comEncaixe.body, 'TST1A01');
    expect(v.passageiros.map((p) => p.matricula).sort()).toEqual([a.matricula, e.matricula].sort());
    expect(comEncaixe.body.pacientes.some((p: Paciente) => p.chaveDemanda === b.chaveDemanda)).toBe(true);
    expect((comEncaixe.body.veiculosSalvos as Carro[]).find((x) => x.placa === 'TST1A01')).toMatchObject({ aviso: '', destino: 'FLORIANÓPOLIS' });
    await c.chamar('/operacao/editar-carro', [DIA, 'TST1A01', { encaixar: [{ ...b, quantidade: 9 }] }, '', '']).expect(400);
    await c.chamar('/operacao/marcar-aviso-enviado', [DIA, 'TST1A02', '', '']).expect(200);
  });

  it('move um passageiro de carro, troca dois de carro e desfaz o carro vazio', async () => {
    const [a, , d, e] = pacientes as [Paciente, Paciente, Paciente, Paciente];
    const movido = await c.chamar('/operacao/mover-passageiro', [DIA, 'TST1A01', e.matricula, 'TST1A02', '', '']).expect(200);
    expect(carro(movido.body, 'TST1A02').passageiros.map((p) => p.matricula)).toContain(e.matricula);
    await c.chamar('/operacao/mover-passageiro', [DIA, 'TST1A01', '000', 'TST1A02', '', '']).expect(404);
    const trocado = await c.chamar('/operacao/trocar-passageiros', [DIA, 'TST1A01', a.matricula, 'TST1A02', d.matricula, '']).expect(200);
    expect(carro(trocado.body, 'TST1A01').passageiros.map((p) => p.matricula)).toEqual([d.matricula]);
    await c.chamar('/operacao/trocar-passageiros', [DIA, 'TST1A01', 'x', 'TST1A02', 'y', '']).expect(404);
    // O último passageiro sai pela confirmação "Cancelado": o carro deixa de aparecer.
    const cancelado = await c.chamar('/operacao/confirmar-passageiro', [DIA, 'TST1A01', d.matricula, 'Cancelado', 'Paciente', null, '', 'Internado']).expect(200);
    expect(carro(cancelado.body, 'TST1A01')).toBeUndefined();
    const desfeito = await c.chamar('/operacao/desfazer-carro', [DIA, 'TST1A02', '', '']).expect(200);
    expect(carro(desfeito.body, 'TST1A02')).toBeUndefined();
    expect(desfeito.body.pacientes.some((p: Paciente) => p.chaveDemanda === a.chaveDemanda)).toBe(true);
  });

  it('a Formação troca o motorista do carro e recusa o que não pode', async () => {
    const [, b] = pacientes as [Paciente, Paciente];
    await c.chamar('/operacao/montar-carros', [{ data: DIA, alocacoes: [{ placa: 'TST1A03', tipo: 'ARGO', motorista: '', horaEmbarque: '10:00', destino: b.cidade, passageiros: [passageiro(b)] }] }]).expect(200);
    const { body: formacao } = await c.chamar('/escala/dados-para-formacao', [DIA]).expect(200);
    const viagem = formacao.viagens.find((v: { placa: string }) => v.placa === 'TST1A03');
    const par = (mudancas: object) => ({ data: viagem.data, idViagem: viagem.idViagem, hora: viagem.hora, destino: viagem.destino, placaLida: 'TST1A03', motoristaLido: '', placa: 'TST1A03', motorista: '', ...mudancas });
    const { body } = await c.chamar('/escala/atribuir-motoristas', [DIA, [
      par({ idViagem: 'NAOEXISTE' }),
      par({ placaLida: 'OUTRA' }),
      par({ placa: 'TST1A06' }),
      par({ placa: 'TST9Z99' }),
      par({ placa: '' , motorista: 'X' }),
      par({ motorista: 'GUSTAVO TERCEIRO ALVES' }),
      par({ motorista: 'NINGUÉM' }),
      par({ placa: 'TST2B01', motorista: 'ANTÔNIO FICTÍCIO DA SILVA' }),
      par({ doisMotoristas: true, motorista: 'EDUARDO MODELO COSTA', motorista2: 'EDUARDO MODELO COSTA' }),
      par({ doisMotoristas: true, motorista: 'EDUARDO MODELO COSTA', motorista2: 'HELENA CONTRATO RIBEIRO' }),
      par({ motorista: 'DANIELA DEMONSTRAÇÃO LIMA', fixado: true }),
    ]]).expect(200);
    expect(body.alterados).toBe(1);
    expect(body.recusadas.length).toBe(10);
    const motivos = body.recusadas.join(' | ');
    for (const trecho of ['não existe mais', 'Reabra a Formação', 'LACEN', 'não está ativo no cadastro', 'sem veículo', 'dirige só o carro dele', 'só o motorista dele dirige', 'não pode ser o 1º e o 2º', 'tem de ser servidor']) {
      expect(motivos).toContain(trecho);
    }
    const depois = (await c.chamar('/escala/dados-para-formacao', [DIA]).expect(200)).body;
    expect(depois.viagens.find((v: { placa: string }) => v.placa === 'TST1A03').motorista).toBe('DANIELA DEMONSTRAÇÃO LIMA');
    expect(depois.fixacoes).toEqual([{ data: '01/12/2026', idViagem: viagem.idViagem, motorista: 'DANIELA DEMONSTRAÇÃO LIMA', segundo: false }]);
  });

  it('o relatório da escala mostra quem vai em cada carro e quem fica', async () => {
    await c.chamar('/escala/escala-do-periodo', [DIA, '2027-12-01']).expect(400);
    const { body } = await c.chamar('/escala/escala-do-periodo', ['2026-12-02', DIA]).expect(200);
    const dia = body.dias[0];
    expect(dia).toMatchObject({ data: '01/12/2026', diaSemana: 'Terça-feira', temEscala: true, ehUtil: true, lacenPlaca: 'TST1A06' });
    expect(dia.externas.map((e: { motorista: string }) => e.motorista)).toContain('DANIELA DEMONSTRAÇÃO LIMA');
    expect(dia.internas.at(-1).atividade).toBe('Consultório de Rua');
    expect(dia.observacoes.some((o: { nome: string; motivo: string }) => o.motivo === 'Férias')).toBe(true);
    expect(body.veiculos.TST1A01.tipo).toBe('SPIN');
  });
});
