// Tela Confirmação e Guias (fluxo 3): a ficha do passageiro, o registro da confirmação, o cancelamento, o envio ao
// paciente pelo WhatsApp (escondido nesta versão, chamado direto) e a troca de carro.
import { apiFalha, apiFalsa, carregarTelas, chamadasA, clicar, esperar, limparChamadas, tela, texto } from './preparar-telas';
import {
  abrirGuia,
  avisos,
  botaoDaJanela,
  cardDe,
  carroDoDia,
  type Dia,
  DATA_DO_TESTE,
  dia,
  diaComTroca,
  elemento,
  estado,
  item,
  janelaAberta,
  limparAvisos,
  linhaDoPassageiro,
  painelAberto,
  passageiroFicticio,
  preencher,
  ROTA_CONFIRMAR,
  ROTA_MOVER,
  ROTA_TROCAR,
  tecla,
  textoDaJanela,
  textos,
  VIAGEM_CURITIBA,
  VIAGEM_FLORIANOPOLIS,
} from './confirmacao-e-guias-ajuda';

const ELISA = 'ELISA MODELO DA SILVA 004';

// Resposta da API de confirmação: o dia com o status gravado no passageiro pedido.
function respostaComStatus(base: Dia) {
  return (argumentos: unknown[]) => {
    const dados = structuredClone(base);
    const [, placa, matricula, status, quem] = argumentos as string[];
    const carro = dados.veiculosSalvos.find((v) => v.placa === placa);
    const passageiro = carro?.passageiros.find((p) => p.matricula === matricula);
    if (passageiro) {
      passageiro.statusConfirmacao = status;
      passageiro.quemAtendeu = quem;
    }
    return dados;
  };
}

function statusNaLista(nome: string): string {
  return linhaDoPassageiro(nome).querySelector('.gp-status')?.textContent ?? '';
}

function botaoSalvarAnotacoes(): HTMLElement {
  const botoes = Array.from(document.querySelectorAll<HTMLElement>('#guiaDrawerContent button'));
  const achado = botoes.find((b) => (b.textContent ?? '').includes('Salvar anotações'));
  if (!achado) throw new Error('Botão "Salvar anotações" não encontrado');
  return achado;
}

function aceso(id: string): boolean {
  return elemento('#' + id).classList.contains('ativo');
}

function chipsMarcados(): string[] {
  return textos('#guiaDrawerContent .guia-chip-atendeu.sel');
}

async function abrirFichaDe(nome: string, dados?: Dia): Promise<void> {
  await abrirGuia(dados);
  clicar(linhaDoPassageiro(nome));
}

describe('Confirmação e Guias: ficha do passageiro', () => {
  beforeAll(carregarTelas);
  beforeEach(limparChamadas);

  it('abre a ficha pelo card com o cabeçalho de três linhas e a aba da ligação', async () => {
    await abrirFichaDe(ELISA);
    expect(painelAberto()).toBe(true);
    expect(elemento('#guiaDrawerOverlay').classList.contains('aberto')).toBe(true);
    expect(estado().confAberto).toBe(VIAGEM_FLORIANOPOLIS + '|900004');
    expect(texto('#guiaDNomePax')).toBe(ELISA);
    // A data de nascimento fora do formato ISO não vira idade.
    expect(texto('#guiaDIdade')).toBe('');
    expect(texto('#guiaDLinha1')).toBe('04:30 - SPIN TST1A01');
    expect(texto('#guiaDLinha2')).toBe('FLORIANÓPOLIS - HOSPITAL REGIONAL DE EXEMPLO');
    expect(linhaDoPassageiro(ELISA).classList.contains('ativo')).toBe(true);
    expect(linhaDoPassageiro('GABRIELA').classList.contains('ativo')).toBe(false);
    expect(aceso('guiaBtnConf')).toBe(false);
    expect(textos('#guiaDrawerContent .guia-chip-atendeu')).toEqual(['Paciente', 'Mãe', 'Pai', 'Cônjuge', 'Filho(a)', 'Acompanhante', 'Vizinho', 'Outro…']);
    expect(chipsMarcados()).toEqual([]);
    expect(elemento<HTMLInputElement>('#gdQuemAtendeu').value).toBe('Paciente');
    expect(elemento<HTMLInputElement>('#gdQuemOutro').style.display).toBe('none');
    expect(elemento<HTMLTextAreaElement>('#gdObs').value).toBe('');
    expect(texto('#guiaDrawerContent')).not.toContain('Confirmação anterior anulada');
  });

  it('mostra na ficha quem atendeu, a idade, o aviso de anulação e o botão do status gravado', async () => {
    const dados = dia();
    const carro = carroDoDia(dados, VIAGEM_FLORIANOPOLIS);
    item(carro.passageiros, 0).quemAtendeu = 'Mãe';
    item(carro.passageiros, 0).nascimento = '1956-07-07';
    item(carro.passageiros, 1).quemAtendeu = 'Tia';
    item(carro.passageiros, 1).obsLigacao = 'Horário de saída mudou';
    item(carro.passageiros, 1).cidade = '';
    item(carro.passageiros, 1).local = '';
    item(carro.passageiros, 1).statusConfirmacao = 'Não atende';
    await abrirFichaDe('GABRIELA', dados);
    expect(texto('#guiaDIdade')).toMatch(/^\d+ anos$/);
    expect(aceso('guiaBtnConf')).toBe(true);
    expect(aceso('guiaBtnNao')).toBe(false);
    expect(chipsMarcados()).toEqual(['Mãe']);
    expect(elemento<HTMLTextAreaElement>('#gdObs').value).toBe('Vai de muleta');

    clicar(linhaDoPassageiro(ELISA));
    // Quem atendeu fora da lista padrão abre o campo "Outro" já preenchido.
    expect(chipsMarcados()).toEqual(['Outro…']);
    expect(elemento<HTMLInputElement>('#gdQuemOutro').style.display).toBe('block');
    expect(elemento<HTMLInputElement>('#gdQuemOutro').value).toBe('Tia');
    expect(texto('#guiaDrawerContent')).toContain('Confirmação anterior anulada: Horário de saída mudou');
    expect(aceso('guiaBtnNao')).toBe(true);
    // Sem cidade no passageiro, o cabeçalho usa o destino do carro.
    expect(texto('#guiaDLinha2')).toBe('FLORIANÓPOLIS');
  });

  it('escolhe quem atendeu pelos chips e pelo campo "Outro"', async () => {
    await abrirFichaDe(ELISA);
    const chips = Array.from(document.querySelectorAll<HTMLElement>('#guiaDrawerContent .guia-chip-atendeu'));
    clicar(item(chips, 1));
    expect(chipsMarcados()).toEqual(['Mãe']);
    expect(tela.getQuemAtendeuPanel()).toBe('Mãe');
    clicar(item(chips, 7));
    expect(chipsMarcados()).toEqual(['Outro…']);
    expect(elemento<HTMLInputElement>('#gdQuemOutro').style.display).toBe('block');
    expect(document.activeElement?.id).toBe('gdQuemOutro');
    preencher('#gdQuemOutro', '  Vizinha da frente ');
    expect(tela.getQuemAtendeuPanel()).toBe('Vizinha da frente');
    // O marcador antigo "Outro…" no campo escondido também lê o texto digitado.
    elemento<HTMLInputElement>('#gdQuemAtendeu').value = 'Outro…';
    expect(tela.getQuemAtendeuPanel()).toBe('Vizinha da frente');
    elemento<HTMLInputElement>('#gdQuemAtendeu').value = '';
    expect(tela.getQuemAtendeuPanel()).toBe('');
    clicar(item(chips, 0));
    expect(elemento<HTMLInputElement>('#gdQuemOutro').style.display).toBe('none');
    expect(tela.getQuemAtendeuPanel()).toBe('Paciente');
  });

  it('fecha a ficha pelo X, pelo fundo e pelo Esc, menos com uma janela aberta por cima', async () => {
    await abrirFichaDe(ELISA);
    clicar('#guiaSlideDrawer .guia-btn-close');
    expect(painelAberto()).toBe(false);
    expect(estado().confAberto).toBe('');
    expect(document.querySelectorAll('#guiaCorpo .guia-pax.ativo')).toHaveLength(0);

    clicar(linhaDoPassageiro(ELISA));
    clicar('#guiaDrawerOverlay');
    expect(painelAberto()).toBe(false);

    clicar(linhaDoPassageiro(ELISA));
    tela.guiaModalAbrir('<div class="gm-titulo">Outra janela</div>');
    tecla(document, 'Escape');
    expect(painelAberto()).toBe(true);
    elemento('#guiaModalOverlay').classList.remove('aberto');
    tecla(document, 'Escape');
    expect(painelAberto()).toBe(false);
    // Sem ficha aberta, o Esc não faz nada.
    tecla(document, 'Escape');
    expect(painelAberto()).toBe(false);
  });

  it('não abre ficha de passageiro que sumiu da tela', async () => {
    await abrirGuia();
    tela.abrirPainelPaxPos(VIAGEM_CURITIBA, 5);
    expect(avisos()).toContain('Passageiro não encontrado. Recarregue a tela.');
    tela.abrirPainelPax(VIAGEM_CURITIBA, 'MATRICULA-QUE-NAO-EXISTE');
    expect(painelAberto()).toBe(false);
    expect(estado().confAberto).toBe('');
    tela.renderDrawerConteudoGuia('ligacao');
    tela.registrarConfirmacaoPanel('Confirmado');
    tela.confirmarCancelarPax();
    tela.enviarWhatsappPaciente();
    tela.transferirPaciente('VIAGEM-02');
    tela.trocarPaciente('VIAGEM-02|900010');
    expect(chamadasA(ROTA_CONFIRMAR)).toHaveLength(0);
    expect(janelaAberta()).toBe(false);
  });

  it('a ficha fecha quando o passageiro some na recarga do dia', async () => {
    await abrirFichaDe(ELISA);
    const semElisa = dia();
    carroDoDia(semElisa, VIAGEM_FLORIANOPOLIS).passageiros.pop();
    tela.carregarGuia(semElisa, true);
    expect(painelAberto()).toBe(false);
    expect(estado().confAberto).toBe('');
  });
});

describe('Confirmação e Guias: resultado do contato', () => {
  beforeAll(carregarTelas);
  beforeEach(limparChamadas);

  it('"Confirmou" muda a tela na hora e grava pela rota de confirmação', async () => {
    apiFalsa(ROTA_CONFIRMAR, respostaComStatus(dia()));
    await abrirFichaDe(ELISA);
    elemento<HTMLTextAreaElement>('#gdObs').value = 'Levar receitas';
    clicar('#guiaBtnConf');
    expect(statusNaLista(ELISA)).toBe('Confirmado');
    expect(aceso('guiaBtnConf')).toBe(true);
    expect(avisos()).toContain('Resultado registrado: Confirmou.');
    expect(textos('#guiaContadores .gcont-chip')[2]).toBe('Confirmados 2');
    await esperar();
    expect(chamadasA(ROTA_CONFIRMAR)).toEqual([[DATA_DO_TESTE, 'TST1A01', '900004', 'Confirmado', 'Paciente', 'Levar receitas', tela.getOperador()]]);
    expect(statusNaLista(ELISA)).toBe('Confirmado');
    // A ficha continua aberta, com o cabeçalho refeito pelos dados do servidor.
    expect(painelAberto()).toBe(true);
    expect(texto('#guiaDNomePax')).toBe(ELISA);
  });

  it('"Confirmou por WhatsApp", "Não atende" e "Salvar anotações" gravam o status certo', async () => {
    apiFalsa(ROTA_CONFIRMAR, respostaComStatus(dia()));
    await abrirFichaDe(ELISA);
    clicar('#guiaBtnConfZap');
    expect(avisos()).toContain('Resultado registrado: Confirmou por WhatsApp.');
    expect(aceso('guiaBtnConfZap')).toBe(true);
    clicar('#guiaBtnNao');
    expect(avisos()).toContain('Resultado registrado: Não atende.');
    await esperar();
    // Com cliques seguidos, a tela fica com o último resultado.
    expect(chamadasA(ROTA_CONFIRMAR).map((a) => a[3])).toEqual(['Confirmado por WhatsApp', 'Não atende']);
    expect(statusNaLista(ELISA)).toBe('Não atende');
    expect(tela.guiaGravacoesContato).toBe(0);
    // Com a ficha aberta de novo, "Salvar anotações" regrava o status que já estava, com a observação nova.
    clicar(linhaDoPassageiro(ELISA));
    elemento<HTMLTextAreaElement>('#gdObs').value = 'Ligar depois das 14h';
    clicar(botaoSalvarAnotacoes());
    await esperar();
    expect(item(chamadasA(ROTA_CONFIRMAR), 2).slice(3, 6)).toEqual(['Não atende', 'Paciente', 'Ligar depois das 14h']);
    expect(tela.statusConfTexto('Outro status')).toBe('Outro status');
  });

  // Defeito encontrado nos testes: o botão "Salvar anotações" leva no onclick o status de quando a aba foi desenhada
  // (confirmacao-e-guias.js, linha 699). Registrando o resultado sem reabrir a ficha, salvar as anotações grava de
  // novo o status antigo e desfaz o resultado. O teste fica marcado como falha esperada até a correção.
  it('"Salvar anotações" logo depois de "Confirmou" mantém o status confirmado', async () => {
    apiFalsa(ROTA_CONFIRMAR, respostaComStatus(dia()));
    await abrirFichaDe(ELISA);
    clicar('#guiaBtnConf');
    await esperar();
    clicar(botaoSalvarAnotacoes());
    await esperar();
    expect(item(item(chamadasA(ROTA_CONFIRMAR), 1), 3)).toBe('Confirmado');
  });

  it('se o servidor recusa, a tela volta ao que estava e avisa', async () => {
    apiFalha(ROTA_CONFIRMAR, 409, 'Passageiro mudou de carro');
    await abrirFichaDe(ELISA);
    clicar('#guiaBtnConf');
    expect(statusNaLista(ELISA)).toBe('Confirmado');
    await esperar();
    expect(statusNaLista(ELISA)).toBe('Ligar');
    expect(aceso('guiaBtnConf')).toBe(false);
    expect(avisos()).toContain(`Não gravou o resultado de ${ELISA}: Passageiro mudou de carro. A tela voltou ao que estava.`);
    expect(tela.guiaGravacoesContato).toBe(0);
  });

  it('com a ficha fechada, a gravação do contato não mexe nos botões da ficha', async () => {
    apiFalha(ROTA_CONFIRMAR, 500, 'Erro interno');
    await abrirGuia();
    limparAvisos();
    const carro = tela.carroDaChave(VIAGEM_CURITIBA);
    const c = { chave: VIAGEM_CURITIBA, placa: 'TST1A03', mat: '900001', v: carro, p: carro.passageiros[0] };
    tela.guiaGravarStatusContato(c, 'Confirmado', '', undefined, '');
    expect(avisos()).toBe('');
    expect(statusNaLista('BRUNO')).toBe('Confirmado');
    await esperar();
    expect(statusNaLista('BRUNO')).toBe('Ligar');
    expect(chamadasA(ROTA_CONFIRMAR)[0]).toEqual([DATA_DO_TESTE, 'TST1A03', '900001', 'Confirmado', '', null, tela.getOperador()]);
  });
});

describe('Confirmação e Guias: cancelar passageiro', () => {
  beforeAll(carregarTelas);
  beforeEach(limparChamadas);

  it('pela ficha: exige a justificativa e grava o status "Cancelado" com o motivo', async () => {
    const depois = dia();
    carroDoDia(depois, VIAGEM_FLORIANOPOLIS).passageiros.pop();
    apiFalsa(ROTA_CONFIRMAR, () => structuredClone(depois));
    await abrirFichaDe(ELISA);
    elemento<HTMLTextAreaElement>('#gdObs').value = 'Internada';
    clicar('#guiaSlideDrawer .guia-btn-qcb.canc');
    expect(janelaAberta()).toBe(true);
    expect(textoDaJanela()).toContain(`Cancelar o paciente ${ELISA}?`);
    expect(textoDaJanela()).toContain('Ele sai do carro e libera a vaga. O motivo fica registrado na confirmação.');
    expect(textoDaJanela()).not.toContain('Lista de Tarefas');
    clicar(botaoDaJanela('Confirmar cancelamento'));
    expect(avisos()).toContain('Descreva a justificativa do cancelamento.');
    expect(janelaAberta()).toBe(true);
    expect(chamadasA(ROTA_CONFIRMAR)).toHaveLength(0);
    // O botão continua armado depois da recusa.
    elemento<HTMLSelectElement>('#gmMotivo').value = 'Cancelado pelo setor';
    elemento<HTMLTextAreaElement>('#gmJustif').value = 'Paciente internada no dia anterior';
    clicar(botaoDaJanela('Confirmar cancelamento'));
    expect(textoDaJanela()).toContain('Cancelando...');
    await esperar();
    expect(chamadasA(ROTA_CONFIRMAR)).toEqual([
      [DATA_DO_TESTE, 'TST1A01', '900004', 'Cancelado', 'Paciente', 'Internada', tela.getOperador(), 'Cancelado pelo setor: Paciente internada no dia anterior'],
    ]);
    expect(painelAberto()).toBe(false);
    expect(textoDaJanela()).toContain('Paciente cancelado!');
    expect(() => linhaDoPassageiro(ELISA)).toThrow();
  });

  it('pela ficha na aba WhatsApp: não apaga a restrição e mantém quem atendeu', async () => {
    const dados = dia();
    item(carroDoDia(dados, VIAGEM_FLORIANOPOLIS).passageiros, 1).quemAtendeu = 'Pai';
    apiFalsa(ROTA_CONFIRMAR, () => structuredClone(dados));
    await abrirFichaDe(ELISA, dados);
    clicar('#guiaTabBtnZap');
    clicar('#guiaSlideDrawer .guia-btn-qcb.canc');
    elemento<HTMLTextAreaElement>('#gmJustif').value = 'Desistiu';
    clicar(botaoDaJanela('Confirmar cancelamento'));
    await esperar();
    expect(chamadasA(ROTA_CONFIRMAR)[0]).toEqual([DATA_DO_TESTE, 'TST1A01', '900004', 'Cancelado', 'Pai', null, tela.getOperador(), 'Paciente cancelou: Desistiu']);
  });

  it('pelo card: não abre a ficha e, ao desistir, a ficha aberta volta a ser a de antes', async () => {
    await abrirFichaDe(ELISA);
    clicar(elemento('.guia-pax-cancelar', cardDe('TST1A03')));
    expect(textoDaJanela()).toContain('Cancelar o paciente BRUNO FICTÍCIA DA SILVA 001?');
    expect(estado().confAberto).toBe(VIAGEM_CURITIBA + '|900001');
    expect(texto('#guiaDNomePax')).toBe(ELISA);
    clicar(botaoDaJanela('Cancelar'));
    expect(estado().confAberto).toBe(VIAGEM_FLORIANOPOLIS + '|900004');
    await esperar(300);
    expect(janelaAberta()).toBe(false);
    expect(chamadasA(ROTA_CONFIRMAR)).toHaveLength(0);
  });

  it('pelo card: com erro da API, avisa e devolve a ficha de antes', async () => {
    apiFalha(ROTA_CONFIRMAR, 400, 'Carro já saiu');
    await abrirFichaDe(ELISA);
    tela.guiaCancelarDoCard(VIAGEM_CURITIBA, 0);
    elemento<HTMLTextAreaElement>('#gmJustif').value = 'Óbito';
    clicar(botaoDaJanela('Confirmar cancelamento'));
    await esperar(300);
    // Pelo card, os campos da ficha aberta (de outra pessoa) não são lidos.
    expect(chamadasA(ROTA_CONFIRMAR)[0]).toEqual([DATA_DO_TESTE, 'TST1A03', '900001', 'Cancelado', '', null, tela.getOperador(), 'Paciente cancelou: Óbito']);
    expect(avisos()).toContain('Erro: Carro já saiu');
    expect(estado().confAberto).toBe(VIAGEM_FLORIANOPOLIS + '|900004');
    expect(janelaAberta()).toBe(false);
    limparAvisos();
    tela.guiaCancelarDoCard(VIAGEM_CURITIBA, 3);
    expect(avisos()).toContain('Passageiro não encontrado. Recarregue a tela.');
  });

  it('pela ficha: com erro da API, avisa e fecha a janela', async () => {
    apiFalha(ROTA_CONFIRMAR, 400, 'Sem permissão');
    await abrirFichaDe(ELISA);
    tela.confirmarCancelarPax();
    elemento<HTMLTextAreaElement>('#gmJustif').value = 'Teste';
    clicar(botaoDaJanela('Confirmar cancelamento'));
    await esperar(300);
    expect(avisos()).toContain('Erro: Sem permissão');
    expect(janelaAberta()).toBe(false);
    expect(painelAberto()).toBe(true);
  });
});

describe('Confirmação e Guias: WhatsApp do paciente (escondido nesta versão)', () => {
  beforeAll(carregarTelas);
  beforeEach(limparChamadas);
  afterEach(() => {
    vi.restoreAllMocks();
    delete (tela as Record<string, unknown>).processarTelefone;
  });

  it('lista os telefones, mostra a prévia e envia pelo telefone escolhido', async () => {
    const abrirJanela = vi.spyOn(window, 'open').mockImplementation(() => null);
    apiFalsa(ROTA_CONFIRMAR, respostaComStatus(dia()));
    await abrirFichaDe(ELISA);
    clicar('#guiaTabBtnZap');
    expect(tela.abaAtivaDrawerGuia).toBe('zap');
    expect(aceso('guiaTabBtnZap')).toBe(true);
    expect(aceso('guiaTabBtnLigacao')).toBe(false);
    expect(textos('#guiaDrawerContent .guia-cz-tel')).toEqual(['00-0000-1004']);
    expect(textos('#guiaDrawerContent .guia-cz-tipo')).toEqual(['Paciente (Principal)']);
    expect(elemento<HTMLInputElement>('#gdFone').value).toBe('0000001004');
    expect(texto('#guiaDrawerContent')).toContain(ELISA);
    tela.selecionarTelefoneConf('00000009999');
    expect(elemento<HTMLInputElement>('#gdFone').value).toBe('00000009999');
    clicar('#guiaDrawerContent .guia-btn-zap');
    expect(abrirJanela).toHaveBeenCalledTimes(1);
    const [endereco, alvo] = abrirJanela.mock.calls[0] as [string, string];
    expect(endereco.startsWith('https://web.whatsapp.com/send/?phone=550000001004&text=')).toBe(true);
    expect(decodeURIComponent(endereco)).toContain(ELISA);
    expect(alvo).toBe('_blank');
    expect(avisos()).toContain('WhatsApp aberto. Status: Enviada.');
    expect(statusNaLista(ELISA)).toBe('Enviado');
    await esperar();
    // Na aba WhatsApp não há campo de quem atendeu nem de restrição: vai a observação que já estava.
    expect(chamadasA(ROTA_CONFIRMAR)[0]).toEqual([DATA_DO_TESTE, 'TST1A01', '900004', 'Enviada por WhatsApp', '', '', tela.getOperador()]);
  });

  it('telefone fixo não tem "Enviar", e telefone curto não abre o WhatsApp', async () => {
    const abrirJanela = vi.spyOn(window, 'open').mockImplementation(() => null);
    tela.processarTelefone = (t: string) => [{ tipo: t.includes('1004') ? 'fixo' : 'celular' }];
    const dados = dia();
    const elisa = item(carroDoDia(dados, VIAGEM_FLORIANOPOLIS).passageiros, 1);
    elisa.telefones = '(00) 0000-1004 / (00) 00000-2004 / ';
    elisa.telefonesAcomp = '(00) 0000-5004';
    await abrirFichaDe(ELISA, dados);
    tela.trocarAbaDrawerGuia('zap');
    expect(textos('#guiaDrawerContent .guia-cz-tel')).toEqual(['00-0000-1004', '00-00000-2004', '00-0000-5004']);
    expect(textos('#guiaDrawerContent .guia-cz-tipo')).toEqual(['Paciente (Principal)', 'Paciente (Principal)', 'Acompanhante']);
    expect(textos('#guiaDrawerContent .guia-cz-fixo')).toEqual(['Fixo, sem WhatsApp']);
    expect(document.querySelectorAll('#guiaDrawerContent .guia-btn-zap')).toHaveLength(2);
    // O primeiro celular, e não o fixo, vem no campo do número.
    expect(elemento<HTMLInputElement>('#gdFone').value).toBe('00000002004');
    elemento<HTMLInputElement>('#gdFone').value = '123';
    tela.enviarWhatsappPaciente();
    expect(avisos()).toContain('Telefone inválido para WhatsApp (precisa de DDD + número).');
    expect(abrirJanela).not.toHaveBeenCalled();
  });

  it('sem telefone cadastrado, a aba avisa e o campo vem vazio', async () => {
    const dados = dia();
    item(carroDoDia(dados, VIAGEM_FLORIANOPOLIS).passageiros, 1).telefones = '';
    await abrirFichaDe(ELISA, dados);
    tela.trocarAbaDrawerGuia('zap');
    expect(texto('#guiaDrawerContent')).toContain('Nenhum telefone cadastrado para este paciente.');
    expect(elemento<HTMLInputElement>('#gdFone').value).toBe('');
    // A aba sem nome conhecido não desenha nada.
    tela.renderDrawerConteudoGuia('aba-que-nao-existe');
    expect(texto('#guiaDrawerContent')).toContain('Nenhum telefone cadastrado');
    expect(tela.formatarTelefonesWpp('')).toBe('—');
    expect(tela.formatarTelefonesWpp('(00) 00000-1234 / 1234')).toBe('00-00000-1234 / 1234');
    expect(tela.soDigitos(null)).toBe('');
  });
});

describe('Confirmação e Guias: mover e trocar passageiro de carro', () => {
  beforeAll(carregarTelas);
  beforeEach(limparChamadas);

  it('a aba Mover / Trocar lista só os carros do mesmo destino com vaga', async () => {
    await abrirFichaDe(ELISA, diaComTroca());
    clicar('#guiaTabBtnMover');
    expect(aceso('guiaTabBtnMover')).toBe(true);
    expect(texto('#guiaDrawerContent')).toContain('Ocupa 1 lugar');
    expect(textos('#guiaDrawerContent .guia-cand-l1')).toEqual(['06:30\n              SPIN • TST1A02']);
    expect(texto('#guiaDrawerContent .guia-cand-l2')).toContain('Destino: FLORIANÓPOLIS • Motorista: CARLOS TESTE PEREIRA • 5 vaga(s) livre(s)');
    // O carro cheio não aceita transferência, mas aceita a troca de um por um.
    expect(estado().tpaxOpcoes?.map((o) => o.nome)).toEqual(['HUGO AMOSTRA DA SILVA 010', 'IARA EXEMPLO DA SILVA 011']);
    expect(item(estado().tpaxOpcoes, 0).detalhe).toBe('FLORIANÓPOLIS · 06:30 · SPIN TST1A02');
  });

  it('transfere o passageiro depois de confirmar na janela', async () => {
    const depois = diaComTroca();
    const elisa = carroDoDia(depois, VIAGEM_FLORIANOPOLIS).passageiros.pop();
    carroDoDia(depois, 'VIAGEM-02').passageiros.push(elisa as never);
    apiFalsa(ROTA_MOVER, () => structuredClone(depois));
    await abrirFichaDe(ELISA, diaComTroca());
    tela.trocarAbaDrawerGuia('mover');
    clicar('#guiaDrawerContent .guia-btn-transf');
    expect(textoDaJanela()).toContain(`Mover ${ELISA} do carro TST1A01 para SPIN TST1A02 (06:30 · FLORIANÓPOLIS)?`);
    clicar(botaoDaJanela('Confirmar transferência'));
    expect(textoDaJanela()).toContain('Transferindo...');
    await esperar();
    expect(chamadasA(ROTA_MOVER)).toEqual([[DATA_DO_TESTE, 'TST1A01', '900004', 'TST1A02', tela.getOperador(), 'VIAGEM-02']]);
    expect(painelAberto()).toBe(false);
    expect(textoDaJanela()).toContain('Paciente transferido!');
    expect(cardDe('TST1A02').textContent).toContain(ELISA);
    await esperar(1500);
    expect(janelaAberta()).toBe(false);
  });

  it('recusa transferir para carro que sumiu ou para o mesmo carro, e avisa o erro da API', async () => {
    apiFalha(ROTA_MOVER, 400, 'Carro lotado');
    await abrirFichaDe(ELISA, diaComTroca());
    tela.transferirPaciente('');
    tela.transferirPaciente('VIAGEM-QUE-NAO-EXISTE');
    expect(avisos()).toContain('O carro de destino não está mais na tela. Recarregue.');
    tela.transferirPaciente(VIAGEM_FLORIANOPOLIS);
    expect(avisos()).toContain('O paciente já está neste carro.');
    expect(janelaAberta()).toBe(false);
    // Desistir na janela não grava.
    tela.transferirPaciente('VIAGEM-02');
    expect(textoDaJanela()).toContain('O paciente volta para Pendente (carro/horário mudaram).');
    expect(textoDaJanela()).not.toContain('Lista de Tarefas');
    clicar(botaoDaJanela('Cancelar'));
    expect(chamadasA(ROTA_MOVER)).toHaveLength(0);
    tela.transferirPaciente('VIAGEM-02');
    clicar(botaoDaJanela('Confirmar transferência'));
    await esperar(300);
    expect(avisos()).toContain('Erro: Carro lotado');
    expect(janelaAberta()).toBe(false);
    expect(painelAberto()).toBe(true);
  });

  it('a busca da troca mostra todos ao clicar, filtra sem acento e escolhe pelo teclado', async () => {
    const depois = diaComTroca();
    apiFalsa(ROTA_TROCAR, () => structuredClone(depois));
    await abrirFichaDe(ELISA, diaComTroca());
    tela.trocarAbaDrawerGuia('mover');
    clicar('#gTpaxBusca');
    expect(elemento('#gTpaxSug').classList.contains('on')).toBe(true);
    expect(textos('#gTpaxSug .guia-tpax-nome')).toEqual(['HUGO AMOSTRA DA SILVA 010', 'IARA EXEMPLO DA SILVA 011']);
    const busca = elemento<HTMLInputElement>('#gTpaxBusca');
    // Enter com mais de um achado e nada marcado não escolhe ninguém.
    tecla(busca, 'Enter');
    expect(janelaAberta()).toBe(false);
    tecla(busca, 'ArrowDown');
    tecla(busca, 'ArrowDown');
    tecla(busca, 'ArrowDown');
    expect(estado().tpaxIdx).toBe(0);
    tecla(busca, 'ArrowUp');
    expect(estado().tpaxIdx).toBe(1);
    expect(document.querySelectorAll('#gTpaxSug .guia-tpax-item.on')).toHaveLength(1);
    tecla(busca, 'Tab');
    preencher('#gTpaxBusca', 'florianopolis 0700');
    expect(texto('#gTpaxSug')).toBe('Nenhum paciente com esse texto.');
    tecla(busca, 'ArrowDown');
    expect(estado().tpaxIdx).toBe(-1);
    preencher('#gTpaxBusca', 'iara florianópolis');
    expect(textos('#gTpaxSug .guia-tpax-nome')).toEqual(['IARA EXEMPLO DA SILVA 011']);
    // Com um único achado, o Enter escolhe sem marcar.
    tecla(busca, 'Enter');
    expect(busca.value).toBe('IARA EXEMPLO DA SILVA 011');
    expect(elemento('#gTpaxSug').classList.contains('on')).toBe(false);
    expect(textoDaJanela()).toContain('Trocar pacientes de carro');
    expect(textoDaJanela()).toContain('Os dois voltam para Pendente.');
    expect(textoDaJanela()).not.toContain('Lista de Tarefas');
    expect(textos('#guiaModalBox .gm-card-nome')).toEqual([ELISA, 'IARA EXEMPLO DA SILVA 011', ELISA, 'IARA EXEMPLO DA SILVA 011']);
    expect(textos('#guiaModalBox .gm-avatar')).toEqual(['E', 'I', 'E', 'I']);
    clicar(botaoDaJanela('Confirmar Troca'));
    expect(textoDaJanela()).toContain('Trocando pacientes...');
    await esperar();
    expect(chamadasA(ROTA_TROCAR)).toEqual([[DATA_DO_TESTE, 'TST1A01', '900004', 'TST1A04', '900011', tela.getOperador()]]);
    expect(textoDaJanela()).toContain('Troca concluída!');
    expect(painelAberto()).toBe(false);
  });

  it('a lista da troca fecha com Esc e com a saída do campo, e escolhe com o mouse', async () => {
    apiFalha(ROTA_TROCAR, 409, 'Paciente já trocado');
    await abrirFichaDe(ELISA, diaComTroca());
    tela.trocarAbaDrawerGuia('mover');
    const busca = elemento<HTMLInputElement>('#gTpaxBusca');
    busca.dispatchEvent(new Event('focus'));
    expect(elemento('#gTpaxSug').classList.contains('on')).toBe(true);
    // O Esc vai direto ao campo, sem subir até o documento: subindo, ele também fecha a ficha inteira (ver o
    // relatório dos testes).
    busca.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: false, cancelable: true }));
    expect(elemento('#gTpaxSug').classList.contains('on')).toBe(false);
    expect(painelAberto()).toBe(true);
    // Com a lista fechada, as teclas não fazem nada.
    tecla(busca, 'ArrowDown');
    expect(estado().tpaxIdx).toBe(-1);
    clicar(busca);
    busca.dispatchEvent(new Event('blur'));
    expect(texto('#gTpaxSug')).toBe('');
    clicar(busca);
    tecla(busca, 'ArrowDown');
    tecla(busca, 'Enter');
    expect(textoDaJanela()).toContain('Trocar pacientes de carro');
    clicar(botaoDaJanela('Cancelar'));
    expect(busca.value).toBe('');
    clicar(busca);
    elemento('#gTpaxSug .guia-tpax-item').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    expect(textoDaJanela()).toContain('HUGO AMOSTRA DA SILVA 010');
    clicar(botaoDaJanela('Confirmar Troca'));
    await esperar(300);
    expect(avisos()).toContain('Erro: Paciente já trocado');
    expect(janelaAberta()).toBe(false);
    // Escolha que não existe e paciente que sumiu.
    tela.guiaTpaxEscolher(99);
    limparAvisos();
    tela.trocarPaciente('VIAGEM-02|MATRICULA-QUE-NAO-EXISTE');
    expect(avisos()).toContain('Paciente para troca não encontrado.');
    tela.trocarPaciente('');
    expect(chamadasA(ROTA_TROCAR)).toHaveLength(1);
  });

  it('marca os lugares do passageiro e calcula a troca pelo tamanho de cada um', async () => {
    const dados = diaComTroca();
    carroDoDia(dados, 'VIAGEM-02').passageiros.push(passageiroFicticio({ matricula: '900012', nome: 'NINA DUPLA DA SILVA 012', quantidade: 2, hora: '' }));
    await abrirFichaDe('GABRIELA', dados);
    tela.trocarAbaDrawerGuia('mover');
    expect(texto('#guiaDrawerContent')).toContain('Ocupa 2 lugares');
    // A passageira de 2 lugares não troca com a do carro cheio de 1 lugar.
    expect(estado().tpaxOpcoes?.map((o) => o.nome)).toEqual(['HUGO AMOSTRA DA SILVA 010', 'NINA DUPLA DA SILVA 012']);
    expect(item(estado().tpaxOpcoes, 1).detalhe).toBe('FLORIANÓPOLIS · 06:30 · SPIN TST1A02 · 2 lug.');

    // Três lugares, sem carro com vaga e sem troca possível.
    const grande = dia();
    item(carroDoDia(grande, VIAGEM_FLORIANOPOLIS).passageiros, 0).quantidade = 3;
    await abrirFichaDe('GABRIELA', grande);
    tela.trocarAbaDrawerGuia('mover');
    expect(texto('#guiaDrawerContent')).toContain('Ocupa 3 lugares');
    expect(texto('#guiaDrawerContent')).toContain('Não há outros carros para este destino com vagas livres suficientes.');
    expect(texto('#guiaDrawerContent')).toContain('Nenhum paciente compatível em outro carro do mesmo destino para troca direta.');
    expect(document.getElementById('gTpaxBusca')).toBeNull();
  });

  it('a aba Mover é refeita quando o dia recarrega com a ficha aberta', async () => {
    await abrirFichaDe(ELISA, diaComTroca());
    tela.trocarAbaDrawerGuia('mover');
    expect(texto('#guiaDrawerContent .guia-cand-l2')).toContain('5 vaga(s) livre(s)');
    const recarga = diaComTroca();
    carroDoDia(recarga, 'VIAGEM-02').bloqueados = 3;
    tela.carregarGuia(recarga, true);
    expect(painelAberto()).toBe(true);
    expect(texto('#guiaDrawerContent .guia-cand-l2')).toContain('2 vaga(s) livre(s)');
    tela.trocarAbaDrawerGuia('ligacao');
  });
});
