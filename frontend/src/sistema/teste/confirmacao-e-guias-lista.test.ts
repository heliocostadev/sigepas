// Tela Confirmação e Guias (fluxo 3): a lista dos carros do dia por cidade, os contadores, os filtros, o card do
// carro e do passageiro, o atalho para a Formação da escala e o aviso urgente do carro.
import { apiFalha, apiFalsa, carregarTelas, chamadasA, clicar, esperar, esquecerChamadas, limparChamadas, tela, texto } from './preparar-telas';
import {
  abrirGuia,
  avisos,
  botaoDaJanela,
  cardDe,
  carroDoDia,
  carroFicticio,
  DATA_DO_TESTE,
  dia,
  elemento,
  estado,
  item,
  janelaAberta,
  limparAvisos,
  linhaDoPassageiro,
  passageiroFicticio,
  ROTA_DO_DIA,
  ROTA_EDITAR_CARRO,
  textoDaJanela,
  textos,
  VIAGEM_BLUMENAU,
  VIAGEM_CURITIBA,
  VIAGEM_FLORIANOPOLIS,
} from './confirmacao-e-guias-ajuda';

function filtrar(id: string, valor: string): void {
  elemento<HTMLInputElement>('#' + id).value = valor;
  tela.renderGuia();
}

function placasNaTela(): string[] {
  return textos('#guiaCorpo .placa-badge');
}

describe('Confirmação e Guias: lista dos carros do dia', () => {
  beforeAll(carregarTelas);
  beforeEach(limparChamadas);

  it('abre o dia agrupado por cidade, com resumo, contadores e o aviso de carga', async () => {
    elemento<HTMLInputElement>('#gFiltroData').value = '';
    tela.cargaDiaEsquecer([DATA_DO_TESTE]);
    limparAvisos();
    tela.iniciarGuia();
    // Sem data escolhida, a tela abre no dia seguinte, que é o dia que o setor monta.
    expect(elemento<HTMLInputElement>('#gFiltroData').value).toBe(tela.dataPadraoISO());
    expect(avisos()).toContain('Carregando confirmação e guias de viagens...');
    await esperar();
    expect(chamadasA(ROTA_DO_DIA)[0]).toEqual([tela.dataPadraoISO(), '']);
    expect(avisos()).toContain('Viagens atualizadas!');

    await abrirGuia();
    expect(textos('#guiaCorpo .gc-nome')).toEqual(['BLUMENAU', 'CURITIBA', 'FLORIANÓPOLIS']);
    expect(textos('#guiaCorpo .gc-meta')).toEqual(['1 veículo · 1 passageiro', '1 veículo · 1 passageiro', '1 veículo · 3 passageiros']);
    expect(texto('#guiaResumo')).toBe('3 veículo(s) · 5 passageiro(s)');
    // Sem WhatsApp no ar: nem chip nem filtro de "Enviada", que o servidor nunca grava.
    expect(textos('#guiaContadores .gcont-chip')).toEqual(['Todos 4', 'Ligar 3', 'Confirmados 1', 'Não atende 0']);
    expect(Array.from(elemento<HTMLSelectElement>('#gFiltroStatusConf').options).map((o) => o.textContent)).toEqual(['Todas', 'Pendentes', 'Confirmado', 'Não atende']);
    expect(elemento('#guiaContadores .gcont-chip').classList.contains('gcont-ativo')).toBe(true);
    // Uma cidade, uma opção: a chave sem acento é o valor e a grafia com acento é o rótulo.
    const cidades = Array.from(elemento<HTMLSelectElement>('#gFiltroCidade').options).map((o) => [o.value, o.textContent]);
    expect(cidades).toEqual([
      ['', 'Todas as Cidades'],
      ['BLUMENAU', 'BLUMENAU'],
      ['CURITIBA', 'CURITIBA'],
      ['FLORIANOPOLIS', 'FLORIANÓPOLIS'],
    ]);
    expect(textos('#gFiltroLocal option')).toEqual([
      'Todos os Locais',
      'CENTRO DE ESPECIALIDADES MODELO',
      'CLÍNICA DE DEMONSTRAÇÃO',
      'HOSPITAL REGIONAL DE EXEMPLO',
    ]);
    expect(estado().locais).toHaveLength(3);
  });

  it('mostra no card do carro as vagas, a categoria, os motoristas, o aviso e a rota', async () => {
    await abrirGuia();
    const spin = cardDe('TST1A01');
    expect(spin.querySelector('.vagas-badge')?.textContent).toBe('3 livre(s)');
    expect(spin.querySelector('.cat-badge')?.textContent).toBe('Púb');
    expect(spin.querySelector('.motorista-label')?.textContent).toBe('ANTÔNIO FICTÍCIO DA SILVA / 2º a definir (2º)');
    expect(spin.querySelector('.cv-hora-saida')?.textContent).toBe('04:30');
    expect(spin.querySelector('.cv-rota')?.textContent).toBe('Joinville › ITAJAÍ › FLORIANÓPOLIS · Saída Secretaria da Saúde');
    expect(spin.textContent).toContain('AVISO URGENTE');
    expect(spin.textContent).toContain('Levar a cadeira de rodas');
    // Os passageiros saem pela hora da consulta.
    expect(textos('.gp-hora', spin)).toEqual(['07:30', '13:00']);
    expect(textos('.gp-status', spin)).toEqual(['Confirmado', 'Ligar']);
    // Os botões de WhatsApp ficam fora da tela nesta versão: o carro não tem WhatsApp do motorista.
    expect(spin.querySelector('.guia-zap')).toBeNull();
    expect(spin.querySelector('.guia-img-btn')).not.toBeNull();
    const terc = cardDe('TST2B01');
    expect(terc.querySelector('.cat-badge')?.textContent).toBe('Terc');
    expect(terc.querySelector('.cat-badge')?.classList.contains('terc')).toBe(true);
    expect(terc.querySelector('.vagas-badge')?.textContent).toBe('4 livre(s)');
    expect(cardDe('TST1A03').querySelector('.motorista-label')?.textContent).toBe('(Sem motorista)');
    expect(cardDe('TST1A03').querySelector('.cv-aviso-selo')).toBeNull();
  });

  it('marca o carro cheio, o excedido, a saída sem hora e o carro sem passageiro', async () => {
    const dados = dia();
    const curitiba = carroDoDia(dados, VIAGEM_CURITIBA);
    item(curitiba.passageiros, 0).quantidade = 4;
    curitiba.roteiro = [];
    const blumenau = carroDoDia(dados, VIAGEM_BLUMENAU);
    item(blumenau.passageiros, 0).quantidade = 7;
    blumenau.horaEmbarque = '';
    blumenau.localEmbarque = '';
    dados.veiculosSalvos.push(
      carroFicticio({ idViagem: '', placa: 'TST1A06', tipo: 'FURGÃO LACEN', destino: '', roteiro: [], passageiros: undefined, limite: 0, categoria: 'publico' }),
    );
    await abrirGuia(dados);
    expect(cardDe('TST1A03').querySelector('.vagas-badge')?.textContent).toBe('Cheio');
    expect(cardDe('TST1A03').querySelector('.vagas-badge')?.classList.contains('sem-vaga')).toBe(true);
    // Sem roteiro gravado, a rota do card é a cidade de destino.
    expect(cardDe('TST1A03').querySelector('.cv-rota')?.textContent).toBe('Joinville › CURITIBA · Saída Secretaria da Saúde');
    expect(cardDe('TST2B01').querySelector('.vagas-badge')?.textContent).toBe('Excedido por 2');
    expect(cardDe('TST2B01').querySelector('.cv-hora-saida')?.classList.contains('vazia')).toBe(true);
    expect(cardDe('TST2B01').querySelector('.cv-hora-saida')?.textContent).toBe('--:--');
    // Carro sem passageiros e sem destino: fica no grupo "Sem destino", com o limite padrão de 4 lugares.
    const lacen = cardDe('TST1A06');
    expect(lacen.textContent).toContain('Nenhum paciente.');
    expect(lacen.querySelector('.vagas-badge')?.textContent).toBe('4 livre(s)');
    expect(textos('#guiaCorpo .gc-nome')).toContain('SEM DESTINO');
    // Somente lugares livres tira o cheio e o excedido.
    elemento<HTMLInputElement>('#gSomenteLivres').checked = true;
    tela.renderGuia();
    expect(placasNaTela()).toEqual(['TST1A01', 'TST1A06']);
  });

  it('abre e fecha o card pelo topo, guardando a viagem aberta', async () => {
    await abrirGuia();
    expect(cardDe('TST1A03').querySelector('.cv-topo')?.classList.contains('recolhido')).toBe(true);
    clicar(elemento('.cv-topo', cardDe('TST1A03')));
    expect(estado().expandidos).toEqual([VIAGEM_CURITIBA]);
    expect(cardDe('TST1A03').querySelector('.cv-corpo')?.classList.contains('recolhido')).toBe(false);
    clicar(elemento('.cv-topo', cardDe('TST1A03')));
    expect(estado().expandidos).toEqual([]);
    expect(cardDe('TST1A03').querySelector('.cv-corpo')?.classList.contains('recolhido')).toBe(true);
  });

  it('filtra por cidade de destino, pela rota e pela cidade do passageiro', async () => {
    const dados = dia();
    dados.cidadesHistoricas = ['FLORIANOPOLIS', 'ITAJAÍ', 'Itajai', ''];
    carroDoDia(dados, VIAGEM_BLUMENAU).passageiros.push(
      passageiroFicticio({ matricula: '900020', nome: 'JOANA PARADA DA SILVA 020', cidade: 'ITAJAÍ', local: 'HOSPITAL FICTÍCIO DO LITORAL' }),
    );
    await abrirGuia(dados);
    // "ITAJAÍ" e "Itajai" viram uma opção só, com o rótulo acentuado.
    const itajai = Array.from(elemento<HTMLSelectElement>('#gFiltroCidade').options).filter((o) => o.value === 'ITAJAI');
    expect(itajai.map((o) => o.textContent)).toEqual(['ITAJAÍ']);
    filtrar('gFiltroCidade', 'ITAJAI');
    // TST1A01 passa por Itajaí na rota; TST2B01 leva uma passageira para Itajaí.
    expect(placasNaTela()).toEqual(['TST2B01', 'TST1A01']);
    filtrar('gFiltroCidade', 'CURITIBA');
    expect(placasNaTela()).toEqual(['TST1A03']);
    expect(texto('#guiaResumo')).toBe('1 veículo(s) · 1 passageiro(s)');
    // A cidade escolhida continua escolhida quando o dia é recarregado.
    tela.carregarGuia(dados, true);
    expect(elemento<HTMLSelectElement>('#gFiltroCidade').value).toBe('CURITIBA');
  });

  it('filtra pelo local de atendimento, pela busca e mostra a lista vazia', async () => {
    await abrirGuia();
    filtrar('gFiltroLocal', 'CENTRO DE ESPECIALIDADES MODELO');
    expect(placasNaTela()).toEqual(['TST2B01']);
    // O local escolhido continua escolhido quando o dia é recarregado.
    tela.carregarGuia(dia(), true);
    expect(elemento<HTMLSelectElement>('#gFiltroLocal').value).toBe('CENTRO DE ESPECIALIDADES MODELO');
    expect(placasNaTela()).toEqual(['TST2B01']);
    filtrar('gFiltroLocal', '');
    filtrar('gBusca', '  GUSTAVO ');
    expect(placasNaTela()).toEqual(['TST2B01']);
    filtrar('gBusca', '900004');
    expect(placasNaTela()).toEqual(['TST1A01']);
    filtrar('gBusca', 'ninguém com este texto');
    expect(texto('#guiaCorpo')).toBe('Nenhum veículo salvo para a data/filtros atuais.');
    expect(texto('#guiaResumo')).toBe('');
  });

  it('filtra pela confirmação pelos contadores, e só mostra no card quem casa com o filtro', async () => {
    const dados = dia();
    item(carroDoDia(dados, VIAGEM_CURITIBA).passageiros, 0).statusConfirmacao = 'Confirmado por WhatsApp';
    item(carroDoDia(dados, VIAGEM_FLORIANOPOLIS).passageiros, 1).statusConfirmacao = 'Status antigo';
    await abrirGuia(dados);
    // "Confirmados" soma os dois jeitos de confirmar. Um status fora da lista conta no total.
    expect(textos('#guiaContadores .gcont-chip')).toEqual(['Todos 4', 'Ligar 1', 'Confirmados 2', 'Não atende 0']);
    const chips = Array.from(document.querySelectorAll<HTMLElement>('#guiaContadores .gcont-chip'));
    clicar(item(chips, 2));
    expect(elemento<HTMLSelectElement>('#gFiltroStatusConf').value).toBe('Confirmado');
    expect(placasNaTela()).toEqual(['TST1A03', 'TST1A01']);
    expect(textos('.gp-nome', cardDe('TST1A01'))[0]).toContain('GABRIELA');
    expect(textos('.gp-nome', cardDe('TST1A01'))).toHaveLength(1);
    expect(cardDe('TST1A03').querySelector('.gp-status')?.textContent).toBe('Confirmado');
    expect(elemento('#guiaContadores .gcont-chip.gcont-ativo').textContent).toBe('Confirmados 2');
    tela.filtrarStatusGuia('Pendente');
    expect(placasNaTela()).toEqual(['TST2B01']);
    expect(cardDe('TST2B01').querySelector('.gp-status')?.textContent).toBe('Ligar');
    tela.filtrarStatusGuia('Não atende');
    expect(texto('#guiaCorpo')).toContain('Nenhum veículo salvo');
    // O status desconhecido aparece como "Ligar".
    expect(tela.statusConfInfo('Status antigo').txt).toContain('Ligar');
    expect(tela.statusConfInfo(undefined).txt).toContain('Ligar');
  });

  it('mostra na linha do passageiro embarque, acompanhante, alertas, cancelamento e observações', async () => {
    const dados = dia();
    const carro = carroDoDia(dados, VIAGEM_CURITIBA);
    carro.passageiros = [
      passageiroFicticio({
        matricula: '900030',
        nome: 'KARINA <B> DA SILVA 030',
        nascimento: '1950-01-01',
        hora: '',
        cidade: '',
        local: '',
        telefones: '',
        enderecoEmbarque: 'Endereço do paciente',
        enderecoResidencia: 'RUA FICTÍCIA 30, 130',
        observacao: 'Cadeirante',
        obsLigacao: 'Horário do carro mudou',
        pedidoCancelado: true,
      }),
      passageiroFicticio({
        matricula: '-',
        nome: '-',
        servidorNome: 'LUCAS SERVIDOR FICTÍCIO',
        servidorMatricula: '7777',
        hora: '07:00',
        acompanhante: 'ACOMPANHANTE FICTÍCIO 31',
        telefonesAcomp: '(00) 0000-5031',
        enderecoEmbarque: 'Terminal Central',
        observacao: 'nenhuma',
      }),
      passageiroFicticio({ matricula: 'N/A', nome: 'MARIA SEM MATRÍCULA 032', hora: '08:00', enderecoEmbarque: 'Endereço do paciente' }),
    ];
    await abrirGuia(dados);
    const karina = linhaDoPassageiro('KARINA');
    // O nome é escapado: o "<B>" aparece como texto, sem virar negrito.
    expect(karina.querySelector('.gp-nome b')).toBeNull();
    expect(karina.querySelector('.gp-nome')?.textContent).toContain('KARINA <B> DA SILVA 030 (mat. 900030)');
    expect(karina.classList.contains('gp-perigo')).toBe(true);
    expect(karina.querySelector('.alerta-pill')?.textContent).toBe('⚠️ IDOSO SEM ACOMPANHANTE');
    expect(karina.querySelector('.gp-idade')?.textContent).toMatch(/^\d+ anos$/);
    expect(karina.textContent).toContain('Local de embarque: RUA FICTÍCIA 30, 130');
    expect(karina.textContent).toContain('Local de atendimento: —');
    expect(karina.textContent).toContain('Telefone: —');
    expect(karina.textContent).toContain('Acompanhante: Sem acompanhante');
    expect(karina.textContent).toContain('🚫 PEDIDO CANCELADO NA UBSF · confira antes de sair');
    expect(karina.textContent).not.toContain('POSTO');
    expect(karina.querySelector('.gp-obs:not([style])')?.textContent).toBe('⚠️ Cadeirante');
    expect(karina.querySelector('.gp-obs-lig')?.textContent).toBe('☎️ Horário do carro mudou');
    expect(karina.querySelector('.gp-hora')?.textContent).toBe('--:--');
    expect(karina.querySelector('.gp-cidade')?.textContent).toBe('—');
    // Servidor: aparece como "Servidor" com o nome e a matrícula informados na Demandas.
    const servidor = linhaDoPassageiro('Servidor');
    expect(servidor.querySelector('.gp-nome')?.textContent).toContain('Servidor LUCAS SERVIDOR FICTÍCIO (mat. 7777)');
    expect(servidor.textContent).toContain('Telefone do acompanhante: (00) 0000-5031');
    expect(servidor.textContent).toContain('Local de embarque: Terminal Central');
    expect(servidor.querySelector('.gp-obs')).toBeNull();
    expect(servidor.querySelector('.gp-idade')?.textContent).toBe('');
    // Matrícula "N/A" não aparece, e o embarque "Endereço do paciente" sem endereço fica com o próprio texto.
    const maria = linhaDoPassageiro('MARIA');
    expect(maria.querySelector('.gp-nome')?.textContent).not.toContain('mat.');
    expect(maria.textContent).toContain('Local de embarque: Endereço do paciente');
    // A linha sem carro não abre a ficha nem tem o botão de cancelar.
    const solta = document.createElement('div');
    solta.innerHTML = tela.cardPassageiroGuiaHTML(passageiroFicticio({ matricula: '1', nome: 'SOLTA' }), '', -1);
    expect(solta.querySelector('.guia-pax')?.getAttribute('onclick')).toBeNull();
    expect(solta.querySelector('.guia-pax-cancelar')).toBeNull();
  });

  it('carrega um dia vazio sem quebrar e mostra o erro da API ao abrir', async () => {
    tela.carregarGuia(undefined, true);
    expect(texto('#guiaCorpo')).toBe('Nenhum veículo salvo para a data/filtros atuais.');
    expect(textos('#guiaContadores .gcont-chip')[0]).toBe('Todos 0');
    apiFalha(ROTA_DO_DIA, 500, 'Banco fora do ar');
    await abrirGuia();
    expect(texto('#guiaCorpo')).toBe('⚠️ Erro ao carregar: Banco fora do ar');
    expect(avisos()).toContain('Erro ao carregar a guia: Banco fora do ar');
  });

  it('ao voltar ao dia, mostra a última carga e redesenha só se o servidor mandar outra', async () => {
    await abrirGuia();
    // Segunda abertura do mesmo dia: a carga guardada aparece na hora, sem o aviso de carregando.
    const mudado = dia();
    mudado._versao = 'nova-versao';
    item(carroDoDia(mudado, VIAGEM_CURITIBA).passageiros, 0).statusConfirmacao = 'Não atende';
    apiFalsa(ROTA_DO_DIA, () => structuredClone(mudado));
    limparAvisos();
    esquecerChamadas();
    tela.iniciarGuia();
    expect(cardDe('TST1A03').querySelector('.gp-status')?.textContent).toBe('Ligar');
    expect(avisos()).not.toContain('Carregando');
    await esperar();
    expect(chamadasA(ROTA_DO_DIA)[0]).toEqual([DATA_DO_TESTE, 'mwy37uiu-2']);
    expect(cardDe('TST1A03').querySelector('.gp-status')?.textContent).toBe('Não atende');
    expect(avisos()).toContain('Viagens atualizadas!');

    // Sem mudança no servidor, nada é redesenhado.
    apiFalsa(ROTA_DO_DIA, { semMudanca: true });
    limparAvisos();
    tela.iniciarGuia();
    await esperar();
    expect(avisos()).toBe('');

    // Trocaram de dia enquanto a tela conferia: a resposta do dia anterior é descartada.
    const outra = dia();
    outra._versao = 'mais-uma';
    item(carroDoDia(outra, VIAGEM_CURITIBA).passageiros, 0).statusConfirmacao = 'Confirmado';
    apiFalsa(ROTA_DO_DIA, () => structuredClone(outra));
    tela.iniciarGuia();
    elemento<HTMLInputElement>('#gFiltroData').value = '2026-11-28';
    await esperar();
    expect(cardDe('TST1A03').querySelector('.gp-status')?.textContent).toBe('Não atende');

    // A carga descartada na tela ficou guardada como a última do dia. Com um resultado de contato ainda gravando,
    // a carga nova do servidor espera a gravação terminar: fica a guardada.
    elemento<HTMLInputElement>('#gFiltroData').value = DATA_DO_TESTE;
    const maisNova = dia();
    maisNova._versao = 'ainda-mais-nova';
    apiFalsa(ROTA_DO_DIA, () => structuredClone(maisNova));
    tela.guiaGravacoesContato = 1;
    tela.iniciarGuia();
    expect(cardDe('TST1A03').querySelector('.gp-status')?.textContent).toBe('Confirmado');
    await esperar();
    expect(cardDe('TST1A03').querySelector('.gp-status')?.textContent).toBe('Confirmado');
    tela.guiaGravacoesContato = 0;
  });

  it('o botão de trocar motorista abre a Formação da escala na data, com a viagem', async () => {
    await abrirGuia();
    const abrirEm = vi.fn();
    const original = tela.escFAbrirEm;
    tela.escFAbrirEm = abrirEm;
    try {
      clicar(elemento('.guia-troca-btn', cardDe('TST1A01')));
      expect(abrirEm).toHaveBeenCalledWith(DATA_DO_TESTE, VIAGEM_FLORIANOPOLIS);
      expect(elemento('#escala').classList.contains('active')).toBe(true);
      // Viagem que sumiu da tela: a Formação abre na data, sem destaque.
      tela.guiaAbrirFormacao('VIAGEM-QUE-NAO-EXISTE');
      expect(abrirEm).toHaveBeenLastCalledWith(DATA_DO_TESTE, '');
      // Sem a tela da escala carregada, o operador recebe o caminho.
      tela.escFAbrirEm = undefined;
      limparAvisos();
      tela.guiaAbrirFormacao(VIAGEM_FLORIANOPOLIS);
      expect(avisos()).toContain('Abra Escala de Viagens → Formação da escala para trocar o motorista.');
    } finally {
      tela.escFAbrirEm = original;
      elemento('#escala').classList.remove('active');
    }
  });
});

describe('Confirmação e Guias: aviso urgente do carro', () => {
  beforeAll(carregarTelas);
  beforeEach(limparChamadas);

  it('abre a janela com o aviso atual e grava o texto novo pela edição do carro', async () => {
    const depois = dia();
    carroDoDia(depois, VIAGEM_FLORIANOPOLIS).aviso = 'Levar a cadeira de rodas e o oxigênio';
    apiFalsa(ROTA_EDITAR_CARRO, () => structuredClone(depois));
    await abrirGuia();
    clicar(elemento('.guia-aviso-btn', cardDe('TST1A01')));
    expect(janelaAberta()).toBe(true);
    expect(textoDaJanela()).toContain('Carro TST1A01 · saída 04:30');
    expect(elemento<HTMLTextAreaElement>('#gmAvisoTxt').value).toBe('Levar a cadeira de rodas');
    expect(document.activeElement?.id).toBe('gmAvisoTxt');
    elemento<HTMLTextAreaElement>('#gmAvisoTxt').value = '  Levar a cadeira de rodas e o oxigênio  ';
    clicar(botaoDaJanela('Salvar'));
    expect(textoDaJanela()).toContain('Salvando o aviso...');
    await esperar();
    expect(chamadasA(ROTA_EDITAR_CARRO)).toEqual([
      [DATA_DO_TESTE, 'TST1A01', { aviso: 'Levar a cadeira de rodas e o oxigênio' }, tela.getOperador(), VIAGEM_FLORIANOPOLIS],
    ]);
    expect(textoDaJanela()).toContain('Aviso salvo. Reenvie a mensagem ao motorista.');
    expect(cardDe('TST1A01').textContent).toContain('Levar a cadeira de rodas e o oxigênio');
  });

  it('remove o aviso, não grava se nada mudou e pede o texto quando o carro não tem aviso', async () => {
    const semAviso = dia();
    carroDoDia(semAviso, VIAGEM_FLORIANOPOLIS).aviso = '';
    apiFalsa(ROTA_EDITAR_CARRO, () => structuredClone(semAviso));
    await abrirGuia();
    tela.abrirAvisoGuia(VIAGEM_FLORIANOPOLIS);
    clicar(botaoDaJanela('Remover aviso'));
    expect(textoDaJanela()).toContain('Removendo o aviso...');
    await esperar();
    expect(item(item(chamadasA(ROTA_EDITAR_CARRO), 0), 2)).toEqual({ aviso: '' });
    expect(textoDaJanela()).toContain('Aviso removido.');
    expect(cardDe('TST1A01').querySelector('.cv-aviso-selo')).toBeNull();

    // Carro sem aviso: a janela não tem "Remover", e salvar vazio só avisa.
    tela.abrirAvisoGuia(VIAGEM_CURITIBA);
    expect(() => botaoDaJanela('Remover aviso')).toThrow();
    limparAvisos();
    clicar(botaoDaJanela('Salvar'));
    expect(avisos()).toContain('Escreva o aviso antes de salvar.');
    expect(chamadasA(ROTA_EDITAR_CARRO)).toHaveLength(1);

    // O mesmo texto de antes fecha a janela sem gravar.
    await abrirGuia();
    tela.abrirAvisoGuia(VIAGEM_FLORIANOPOLIS);
    clicar(botaoDaJanela('Salvar'));
    await esperar(300);
    expect(janelaAberta()).toBe(false);
    expect(chamadasA(ROTA_EDITAR_CARRO)).toHaveLength(1);
  });

  it('avisa quando o servidor recusa o aviso e ignora carro que não está na tela', async () => {
    apiFalha(ROTA_EDITAR_CARRO, 400, 'Carro já saiu');
    await abrirGuia();
    tela.abrirAvisoGuia(VIAGEM_CURITIBA);
    elemento<HTMLTextAreaElement>('#gmAvisoTxt').value = 'Portaria lateral';
    clicar(botaoDaJanela('Salvar'));
    await esperar(300);
    expect(avisos()).toContain('Não gravou. Carro já saiu');
    expect(janelaAberta()).toBe(false);
    tela.abrirAvisoGuia('VIAGEM-QUE-NAO-EXISTE');
    expect(janelaAberta()).toBe(false);
    tela.salvarAvisoGuia('VIAGEM-QUE-NAO-EXISTE', false);
    expect(chamadasA(ROTA_EDITAR_CARRO)).toHaveLength(1);
  });
});
