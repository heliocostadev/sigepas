// Tela Escala de Viagens (fluxo 2): quem trabalha no dia, a ordem da escala e qual motorista leva cada carro.
import { apiFalha, apiFalsa, carregarTelas, chamadasA, clicar, DADOS, esperar, esquecerChamadas, limparChamadas, tela, texto } from './preparar-telas';

type Viagem = { idViagem: string; placa: string; motorista: string; motorista2: string; doisMotoristas: boolean; terceirizado: boolean; fixado: boolean; fixado2: boolean };

const ANTONIO = 'ANTÔNIO FICTÍCIO DA SILVA';
const BEATRIZ = 'BEATRIZ EXEMPLO SOUZA';
const CARLOS = 'CARLOS TESTE PEREIRA';
const DANIELA = 'DANIELA DEMONSTRAÇÃO LIMA';

function formacao(mudancas: Record<string, unknown> = {}) {
  return { ...structuredClone(DADOS.dadosParaFormacao), ...mudancas };
}

function viagens(): Viagem[] {
  return tela.estadoEscF.viagens;
}

function chkServidor(nome: string): HTMLInputElement {
  return document.querySelector(`#escFCorpo .escf-chk-serv[value="${nome}"]`) as HTMLInputElement;
}

function eventoDoBotao(): { currentTarget: HTMLElement; stopPropagation: () => void } {
  const botao = document.createElement('button');
  botao.setAttribute('onclick', `teste-${Math.random()}`);
  document.body.appendChild(botao);
  return { currentTarget: botao, stopPropagation: vi.fn() };
}

// Clica na opção da lista aberta na pílula que contém o texto.
function escolherNaLista(trecho: string) {
  const opcao = Array.from(document.querySelectorAll('#escFMenu .op')).find((o) => o.textContent?.includes(trecho)) as HTMLElement;
  if (!opcao) throw new Error(`Opção não encontrada: ${trecho}`);
  opcao.click();
}

async function abrir(dados = formacao()) {
  apiFalsa('/api/escala/dados-para-formacao', () => structuredClone(dados));
  (document.getElementById('escFData') as HTMLInputElement).value = '2026-11-27';
  tela.escCarregarTudo();
  await esperar();
}

describe('Escala de Viagens', () => {
  beforeAll(async () => {
    // O jsdom não tem scrollIntoView, que a tela usa para mostrar a viagem destacada.
    Element.prototype.scrollIntoView = vi.fn();
    await carregarTelas();
    tela.mudarAba('escala', document.querySelectorAll('.ds-nav-aba')[3]);
    await esperar();
  });
  beforeEach(async () => {
    limparChamadas();
    await abrir();
    esquecerChamadas();
  });

  it('carrega a formação e distribui os motoristas pela ordem da escala, sem repetir no dia', () => {
    expect(texto('#escCtxChip')).toContain('Sexta · dia útil');
    expect(texto('#escFCorpo')).toContain('Forma-se escala todo dia útil.');
    const [florianopolis, curitiba, blumenau] = viagens();
    expect(florianopolis).toMatchObject({ motorista: ANTONIO, motorista2: BEATRIZ });
    expect(curitiba?.motorista).toBe(CARLOS);
    expect(blumenau).toMatchObject({ motorista: 'GUSTAVO TERCEIRO ALVES', terceirizado: true });
    expect(texto('#escFViagens')).toContain('CURITIBA');
    expect(texto('#escSecInternas')).toContain('Consultório de Rua');
    expect(texto('#escSecInternas')).toContain('Recomeçar');
    expect(texto('#escFViagensTerc')).toContain('GUSTAVO TERCEIRO ALVES');
    expect(texto('#escFDica')).toContain('6 na fila · 3 viagem(ns)');
    expect(tela.escPendencias()).toBeGreaterThan(0);
  });

  it('marcar alguém como ausente tira da fila, redistribui e entra nas observações com o motivo', () => {
    const beatriz = chkServidor(BEATRIZ);
    beatriz.checked = true;
    beatriz.dispatchEvent(new Event('change'));
    const item = beatriz.closest('.escf-item') as HTMLElement;
    expect((item.querySelector('.escf-obs-cx') as HTMLElement).style.display).toBe('block');
    (item.querySelector('select') as HTMLSelectElement).value = 'Férias';
    (item.querySelector('.escf-obs') as HTMLInputElement).value = 'volta dia 10';
    tela.escFDica();
    expect(viagens()[0]?.motorista2).toBe(CARLOS);
    expect(viagens()[1]?.motorista).toBe(DANIELA);
    expect(texto('#escFDica')).toContain('1 servidor(es) fora hoje');
    expect(texto('#escSecObs')).toContain('Férias');
    expect(texto('#escSecObs')).toContain('volta dia 10');
    beatriz.checked = false;
    beatriz.dispatchEvent(new Event('change'));
    expect(viagens()[0]?.motorista2).toBe(BEATRIZ);
  });

  it('o motorista da vez gira a fila, e arrastar reordena sem bagunçar os ausentes', () => {
    const vez = document.getElementById('escFVez') as HTMLSelectElement;
    vez.value = CARLOS;
    vez.dispatchEvent(new Event('change'));
    expect(tela.escFFila()[0].nome).toBe(CARLOS);
    expect(viagens()[0]?.motorista).toBe(CARLOS);
    const itens = document.querySelectorAll('#escFOrdem .escf-ord-item');
    const evento = (alvo: Element) => ({ currentTarget: alvo, preventDefault: vi.fn(), dataTransfer: { setData: vi.fn(), effectAllowed: '', dropEffect: '' } });
    tela.escFDragStart(evento(itens[0] as Element), 0);
    tela.escFDragOver(evento(itens[2] as Element));
    expect((itens[2] as Element).classList.contains('alvo')).toBe(true);
    tela.escFDragLeave(evento(itens[2] as Element));
    tela.escFDrop(evento(itens[2] as Element), 2);
    tela.escFDragEnd();
    expect(tela.escFFila().map((m: { nome: string }) => m.nome).slice(0, 3)).toEqual([DANIELA, 'EDUARDO MODELO COSTA', CARLOS]);
    tela.escFDragOver(evento(itens[1] as Element));
    vez.value = '';
    tela.escFGerar();
    expect(texto('#escFOrdem')).toContain('Escolha o motorista da vez');
    expect(viagens()[1]?.motorista).toBe('');
  });

  it('o cadeado fixa o motorista: mudar a ordem não tira ele da viagem', () => {
    tela.escFCadeado(1, 1);
    expect(viagens()[1]?.fixado).toBe(true);
    const vez = document.getElementById('escFVez') as HTMLSelectElement;
    vez.value = DANIELA;
    vez.dispatchEvent(new Event('change'));
    expect(viagens()[1]?.motorista).toBe(CARLOS);
    tela.escFCadeado(1, 1);
    expect(viagens()[1]?.fixado).toBe(false);
    tela.escFCadeado(0, 2);
    expect(viagens()[0]?.fixado2).toBe(true);
    tela.escFCadeado(0, 2);
    viagens()[1]!.motorista = '';
    tela.escFCadeado(1, 1);
    expect(viagens()[1]?.motorista).not.toBe('');
    viagens()[0]!.motorista2 = '';
    tela.escFCadeado(0, 2);
    tela.escFCadeado(2, 1);
    expect(viagens()[2]?.fixado).toBe(false);
  });

  it('marcar ausente quem estava fixado solta a viagem com aviso', () => {
    tela.escFCadeado(1, 1);
    tela.escFCadeado(0, 2);
    const carlos = chkServidor(CARLOS);
    carlos.checked = true;
    carlos.dispatchEvent(new Event('change'));
    const beatriz = chkServidor(BEATRIZ);
    beatriz.checked = true;
    beatriz.dispatchEvent(new Event('change'));
    expect(viagens()[1]?.fixado).toBe(false);
    expect(viagens()[1]?.motorista).not.toBe(CARLOS);
    expect(viagens()[0]?.fixado2).toBe(false);
  });

  it('a lista da pílula troca o motorista: quem estava em outra viagem sai de lá', () => {
    tela.escFMenuMotorista(eventoDoBotao(), 1, 1);
    expect(texto('#escFMenu')).toContain('Livres');
    expect(texto('#escFMenu')).toContain('Em viagem');
    escolherNaLista(ANTONIO);
    expect(viagens()[1]?.motorista).toBe(ANTONIO);
    expect(viagens()[0]?.motorista).toBe('');
    expect(texto('#escFDica')).toContain('1 sem motorista');
    tela.escFMenuMotorista(eventoDoBotao(), 0, 2);
    escolherNaLista(DANIELA);
    expect(viagens()[0]?.motorista2).toBe(DANIELA);
    tela.escFMenuMotorista(eventoDoBotao(), 0, 2);
    escolherNaLista('Tirar o 2º motorista');
    expect(viagens()[0]?.doisMotoristas).toBe(false);
    tela.escFMenuMotorista(eventoDoBotao(), 1, 1);
    escolherNaLista('Adicionar 2º motorista');
    expect(viagens()[1]?.doisMotoristas).toBe(true);
    expect(viagens()[1]?.motorista2).not.toBe('');
  });

  it('escolher terceirizado leva a viagem para o carro dele; servidor numa viagem de terceirizado volta', () => {
    tela.escFEscolherMotorista(1, 'HELENA CONTRATO RIBEIRO');
    expect(viagens()[1]).toMatchObject({ terceirizado: true, placa: 'TST2B02', motorista: 'HELENA CONTRATO RIBEIRO' });
    tela.escFEscolherMotorista(0, 'GUSTAVO TERCEIRO ALVES');
    expect(viagens()[0]).toMatchObject({ terceirizado: true, placa: 'TST2B01', doisMotoristas: false });
    expect(viagens()[2]).toMatchObject({ terceirizado: false, placa: '', motorista: '' });
    expect(texto('#escFDica')).toContain('viagem(ns) sem veículo');
    expect((document.getElementById('escFOk') as HTMLButtonElement).disabled).toBe(true);
    tela.escFEscolherMotorista(1, DANIELA);
    expect(viagens()[1]).toMatchObject({ terceirizado: false, placa: '' });
    tela.estadoEscF.terceirizados.push({ nome: 'SEM CARRO FICTÍCIO', placaVinculada: '' }, { nome: 'CARRO PEQUENO', placaVinculada: 'TST9C01', lotacaoVeiculo: 1 });
    tela.escFEscolherMotorista(0, 'SEM CARRO FICTÍCIO');
    expect(texto('#toastArea')).toContain('não tem carro cadastrado');
    tela.escFEscolherMotorista(0, 'CARRO PEQUENO');
    expect(texto('#toastArea')).toContain('Faltam');
    tela.escFEscolherMotorista(0, '');
    tela.escFEscolherMotorista2(1, '');
  });

  it('a lista do veículo mostra lotação e uso; carro pequeno demais é recusado', () => {
    tela.escFMenuVeiculo(eventoDoBotao(), 0);
    expect(texto('#escFMenu')).toContain('6 lugares');
    expect(texto('#escFMenu')).toContain('não cabe');
    expect(texto('#escFMenu')).not.toContain('TST1A06');
    escolherNaLista('TST1A05');
    expect(texto('#toastArea')).toContain('TST1A05 leva 2 e esta viagem tem 3');
    tela.escFMenuVeiculo(eventoDoBotao(), 0);
    escolherNaLista('TST1A04');
    expect(viagens()[0]?.placa).toBe('TST1A04');
    tela.escFEscolherVeiculo(0, '');
    tela.escFMenuVeiculo(eventoDoBotao(), 2);
    expect(document.getElementById('escFMenu')).toBeNull();
  });

  it('a lista fecha com Esc, clique fora ou clicando de novo na mesma pílula', () => {
    const evento = eventoDoBotao();
    tela.escFMenuMotorista(evento, 1, 1);
    tela.escFMenuMotorista(evento, 1, 1);
    expect(document.getElementById('escFMenu')).toBeNull();
    tela.escFMenuMotorista(eventoDoBotao(), 1, 1);
    tela.escFMenuVeiculo(eventoDoBotao(), 1);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.getElementById('escFMenu')).toBeNull();
    tela.escFMenuMotorista(eventoDoBotao(), 1, 1);
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('escFMenu')).toBeNull();
    tela.escFMenuMotorista(eventoDoBotao(), 1, 1);
    document.dispatchEvent(new Event('scroll'));
    expect(document.getElementById('escFMenu')).toBeNull();
  });

  it('gravar mostra o resumo do que muda e grava a escala e depois os motoristas das viagens', async () => {
    apiFalsa('/api/escala/salvar-escala-do-dia', { datas: ['27/11/2026'] });
    apiFalsa('/api/escala/atribuir-motoristas', { alterados: 2, recusadas: ['05:30 CURITIBA: mudou depois que a Formação abriu'] });
    tela.escFGravar();
    expect(texto('#dsConfTit')).toBe('Confira antes de gravar');
    expect(texto('#dsConfCorpo')).toContain('motorista (sem) → CARLOS TESTE PEREIRA');
    expect(texto('#dsConfCorpo')).toContain('2º motorista (sem) → BEATRIZ EXEMPLO SOUZA');
    clicar('#dsConfOk');
    await esperar(60);
    const [escala] = chamadasA('/api/escala/salvar-escala-do-dia')[0] as [{ motoristas: { nome: string; posicao: number }[]; veiculos: unknown[] }];
    expect(escala.motoristas.find((m) => m.nome === CARLOS)?.posicao).toBe(3);
    expect(escala.veiculos.length).toBe(8);
    const [data, pares] = chamadasA('/api/escala/atribuir-motoristas')[0] as [string, { placa: string; motorista: string; motorista2: string }[]];
    expect(data).toBe('2026-11-27');
    expect(pares[0]).toMatchObject({ placa: 'TST1A01', motorista: ANTONIO, motorista2: BEATRIZ });
    expect(texto('#toastArea')).toContain('2 viagem(ns) com motorista ou carro novo.');
    expect(texto('#toastArea')).toContain('Não gravadas:');
  });

  it('gravar sem viagens grava só a fila; falhas da API aparecem na barra de baixo', async () => {
    await abrir(formacao({ viagens: [] }));
    apiFalsa('/api/escala/salvar-escala-do-dia', { datas: ['05/12/2026', '06/12/2026'] });
    tela.escFGravarAgora('2026-11-27');
    await esperar(60);
    expect(texto('#toastArea')).toContain('Escala gravada para 05/12, 06/12.');
    expect(chamadasA('/api/escala/atribuir-motoristas')).toEqual([]);
    await abrir();
    apiFalha('/api/escala/salvar-escala-do-dia', 500, 'Banco fora do ar');
    tela.escFGravarAgora('2026-11-27');
    await esperar(60);
    expect(texto('#escFDica')).toBe('Não gravou.');
    limparChamadas();
    apiFalsa('/api/escala/salvar-escala-do-dia', { datas: ['27/11/2026'] });
    apiFalha('/api/escala/atribuir-motoristas', 500, 'Banco fora do ar');
    tela.escFGravarAgora('2026-11-27');
    await esperar(60);
    expect(texto('#escFDica')).toBe('Fila gravada, atribuição não.');
  });

  it('gravar sem data ou com viagem sem carro avisa antes', () => {
    viagens()[1]!.placa = '';
    tela.escFGravar();
    expect(texto('#toastArea')).toContain('Escolha o carro de 1 viagem(ns) antes de gravar.');
    (document.getElementById('escFData') as HTMLInputElement).value = '';
    tela.escFGravar();
    expect(texto('#toastArea')).toContain('Escolha a data.');
    tela.escFBuscar();
    tela.escCarregarTudo();
  });

  it('trocar de dia com mudança não gravada pergunta antes; desfazer e recolher', async () => {
    tela.escMudarDia(1);
    expect(texto('#dsConfTit')).toBe('Mudanças não gravadas');
    clicar('#dsConfNao');
    expect((document.getElementById('escFData') as HTMLInputElement).value).toBe('2026-11-27');
    tela.escMudarDia(1);
    clicar('#dsConfOk');
    await esperar();
    expect(chamadasA('/api/escala/dados-para-formacao').at(-1)).toEqual(['2026-11-28']);
    await abrir();
    tela.escDesfazer();
    clicar('#dsConfOk');
    await esperar();
    tela.escRecolherFormacao();
    expect(document.getElementById('escSec1')?.classList.contains('recolhida')).toBe(true);
    tela.escRecolherFormacao();
  });

  it('sair da aba com mudança não gravada pede confirmação', async () => {
    const outraAba = document.querySelectorAll('.ds-nav-aba')[0] as HTMLElement;
    outraAba.click();
    expect(texto('#dsConfTit')).toBe('Mudanças não gravadas');
    clicar('#dsConfOk');
    expect(tela.abaAtiva()).toBe('importacao');
    tela.mudarAba('escala', document.querySelectorAll('.ds-nav-aba')[3]);
    await esperar();
  });

  it('período de dias não úteis: chip, aviso e remoção interna inexistente', async () => {
    const contexto = { data: '05/12/2026', diaSemana: 'sábado', tipo: 'Sábado', descricao: '', ehUtil: false, ancora: '05/12/2026', ehAncora: true, dias: ['05/12/2026', '06/12/2026'], ancoraTemEscala: false };
    const doPeriodo = formacao({
      contexto,
      viagens: [{ data: '05/12/2026', idViagem: 'A1', placa: 'TST1A01', tipo: 'SPIN', motorista: '', hora: '06:00', destino: 'CURITIBA', ocupados: 1 }, { data: '06/12/2026', idViagem: 'A2', placa: 'TST1A02', tipo: 'SPIN', motorista: '', hora: '06:00', destino: 'BLUMENAU', ocupados: 1 }],
    });
    apiFalsa('/api/escala/escala-do-periodo', { dias: [{ data: '05/12/2026', ehUtil: false, tipoDia: 'Sábado', descricaoDia: '', terceirizados: [{ motorista: 'HELENA CONTRATO RIBEIRO', placa: 'TST2B02', tipo: 'VAN', interno: false }], observacoes: [{ tipo: 'veiculo', nome: 'TST1A05', origem: 'global', motivo: 'Manutenção' }] }], veiculos: {} });
    await abrir(doPeriodo);
    expect(texto('#escCtxChip')).toContain('Período de 2 dias · 05/12 a 06/12');
    expect(texto('#escFCorpo')).toContain('Este é o primeiro dia do período');
    expect(texto('#escSecInternas')).toContain('Não há remoção interna: Sábado');
    expect(texto('#escFViagensTerc')).toContain('Sem viagem');
    expect(texto('#escSecObs')).toContain('Do cadastro');
    expect(viagens()[0]?.motorista).toBe(ANTONIO);
    expect(viagens()[1]?.motorista).toBe(BEATRIZ);
  });

  it('dia que não é o primeiro do período manda abrir o primeiro', async () => {
    await abrir(formacao({ contexto: { data: '06/12/2026', diaSemana: 'domingo', tipo: 'Domingo', descricao: 'Fictício', ehUtil: false, ancora: '05/12/2026', ehAncora: false, dias: ['06/12/2026'], ancoraTemEscala: true } }));
    expect(texto('#escCtxChip')).toContain('o período começa em 05/12');
    expect(texto('#escFCorpo')).toContain('A escala deste período já foi formada em 05/12/2026');
    await abrir(formacao({ contexto: { data: '06/12/2026', diaSemana: 'domingo', tipo: 'Domingo', descricao: '', ehUtil: false, ancora: '05/12/2026', ehAncora: false, dias: ['06/12/2026'], ancoraTemEscala: false } }));
    expect(texto('#escFCorpo')).toContain('é lá que a escala deveria ser formada');
    tela.escFIrPara('05/12/2026');
    clicar('#dsConfOk');
    await esperar();
    expect(chamadasA('/api/escala/dados-para-formacao').at(-1)).toEqual(['2026-12-05']);
    await abrir(formacao({ contexto: { data: '25/12/2026', diaSemana: 'sexta', tipo: 'Feriado', descricao: 'Natal', ehUtil: false, ancora: '25/12/2026', ehAncora: true, dias: ['25/12/2026'], ancoraTemEscala: false } }));
    expect(texto('#escCtxChip')).toContain('Sexta · Feriado');
    await abrir(formacao({ contexto: null }));
    expect(texto('#escCtxChip')).toBe('');
  });

  it('o atalho da Guia abre a data com a viagem destacada; a Escala para Enviar abre no mesmo dia', async () => {
    tela.escFAbrirEm('2026-11-27', 'FCC4B796');
    expect(document.querySelector('#escFViagens tr.destaque')).not.toBeNull();
    tela.escFAbrirEm('2026-11-30', '');
    await esperar();
    expect(chamadasA('/api/escala/dados-para-formacao').at(-1)).toEqual(['2026-11-30']);
    tela.escIrParaEnviar();
    await esperar();
    expect((document.getElementById('envData') as HTMLInputElement).value).toBe('2026-11-30');
    tela.mudarAba('escala', document.querySelectorAll('.ds-nav-aba')[3]);
    await esperar();
  });

  it('erros da API na formação e no relatório aparecem na tela', async () => {
    apiFalha('/api/escala/escala-do-periodo', 500, 'Relatório fora do ar');
    await abrir();
    expect(texto('#escSecObs')).toContain('Não foi possível carregar o relatório: Relatório fora do ar');
    apiFalha('/api/escala/dados-para-formacao', 500, 'Formação fora do ar');
    tela.escCarregarTudo();
    await esperar();
    expect(texto('#escFCorpo')).toContain('Erro ao carregar');
  });

  it('cores e textos auxiliares da folha', () => {
    tela.escVeiculos = { TST1A01: { tipo: 'SPIN', cor: '#fef3c7' }, TST1A02: { tipo: 'SPIN', cor: '#1e3a8a' } };
    expect(tela.escVeiculoHTML('TST1A01', '', false)).toContain('claro');
    expect(tela.escVeiculoHTML('TST1A02', 'VAN', true)).toContain('tinta-branca');
    expect(tela.escVeiculoHTML('', '', false)).toContain('—');
    expect(tela.escCorHex('abc')).toBe('#aabbcc');
    expect(tela.escCorHex('red;x')).toBe('');
    expect(tela.escFRotuloDia('x')).toBe('x');
    expect(tela.escFIsoDe('x')).toBe('');
    expect(tela.escEsc(null)).toBe('');
    expect(tela.escCardObservacoesHTML({ observacoes: [] }, 'hoje')).toContain('Nenhuma indisponibilidade registrada.');
    expect(tela.escLinhaObsHTML({ tipo: 'motorista', nome: 'GUSTAVO', placa: 'TST2B01', carroParadoJunto: true, motivo: '', observacao: 'obs' })).toContain('parado junto');
    expect(tela.escHojeISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
