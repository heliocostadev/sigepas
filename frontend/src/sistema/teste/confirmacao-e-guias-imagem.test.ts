// Tela Confirmação e Guias (fluxo 3): a imagem da guia de cada carro, o "Baixar guias" de todos os carros do dia e a
// mensagem ao motorista pelo WhatsApp, com um ou dois motoristas. Os botões de WhatsApp ficam escondidos nesta
// versão, mas o código existe: aqui ele é chamado direto, sem abrir janela de verdade.
import { apiFalsa, carregarTelas, chamadasA, clicar, esperar, limparChamadas, tela, texto } from './preparar-telas';
import {
  abrirGuia,
  avisos,
  botaoDaJanela,
  cardDe,
  carroDoDia,
  carroFicticio,
  type Dia,
  DATA_DO_TESTE,
  dia,
  elemento,
  item,
  janelaAberta,
  limparAvisos,
  passageiroFicticio,
  ROTA_AVISO_ENVIADO,
  textoDaJanela,
  textos,
  VIAGEM_BLUMENAU,
  VIAGEM_CURITIBA,
  VIAGEM_FLORIANOPOLIS,
} from './confirmacao-e-guias-ajuda';

const ZAP_PEDRO = '00000000000';
const ZAP_ANTONIO = '00000000001';

interface Download {
  nome: string;
  endereco: string;
}

let downloads: Download[] = [];
const html2canvasOriginal = tela.html2canvas;

function canvasFalso() {
  return {
    toDataURL: () => 'data:image/png;base64,AAAA',
    toBlob: (devolver: (b: Blob | null) => void) => devolver(new Blob(['imagem'], { type: 'image/png' })),
  };
}

// Dia com WhatsApp nos motoristas: TST1A03 com um motorista e TST1A01 com dois (o 2º sem WhatsApp).
function diaComWhatsapp(): Dia {
  const dados = dia();
  const curitiba = carroDoDia(dados, VIAGEM_CURITIBA);
  curitiba.motoristaAtribuido = 'PEDRO EXEMPLO';
  curitiba.whatsappMotorista = ZAP_PEDRO;
  const floripa = carroDoDia(dados, VIAGEM_FLORIANOPOLIS);
  floripa.motorista2 = 'QUITÉRIA SEGUNDA';
  floripa.whatsappMotorista = ZAP_ANTONIO;
  return dados;
}

function botaoImagem(placa: string): HTMLButtonElement {
  return elemento<HTMLButtonElement>('.guia-img-btn', cardDe(placa));
}

// A área de transferência do navegador, falsa: guarda o que a tela pediu para copiar.
function areaDeTransferencia(resultado: 'copia' | 'recusa' | 'quebra') {
  const itens: unknown[] = [];
  class ItemFalso {
    constructor(conteudo: Record<string, Promise<Blob>>) {
      // A tela entrega a imagem como promessa. Se ela falhar, a falha é tratada aqui, como o navegador faria.
      Object.values(conteudo).forEach((p) => p.catch(() => undefined));
      itens.push(conteudo);
    }
  }
  const escrever = vi.fn(() => {
    if (resultado === 'quebra') throw new Error('sem permissão');
    return resultado === 'copia' ? Promise.resolve() : Promise.reject(new Error('negado'));
  });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { write: escrever } });
  tela.ClipboardItem = ItemFalso;
  return { itens, escrever };
}

describe('Confirmação e Guias: imagem da guia e WhatsApp do motorista', () => {
  beforeAll(carregarTelas);
  beforeEach(() => {
    limparChamadas();
    downloads = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push({ nome: this.download, endereco: this.href });
    });
    tela.html2canvas = vi.fn(() => Promise.resolve(canvasFalso()));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    tela.html2canvas = html2canvasOriginal;
    delete (navigator as unknown as Record<string, unknown>).clipboard;
    delete (tela as Record<string, unknown>).ClipboardItem;
  });

  it('baixa a imagem do carro sem WhatsApp do motorista e destrava o botão', async () => {
    await abrirGuia();
    const botao = botaoImagem('TST1A03');
    const desenhoAntes = botao.innerHTML;
    clicar(botao);
    expect(botao.disabled).toBe(true);
    expect(botao.innerHTML).toContain('ti-loader-2');
    // Clique repetido com o botão travado não gera outra imagem.
    tela.guiaImagemViagem(VIAGEM_CURITIBA, botao);
    await esperar(150);
    expect(tela.html2canvas).toHaveBeenCalledTimes(1);
    const [palco, opcoes] = (tela.html2canvas as ReturnType<typeof vi.fn>).mock.calls[0] as [HTMLElement, Record<string, unknown>];
    expect(palco.classList.contains('gimg')).toBe(true);
    expect(opcoes).toMatchObject({ scale: 3, backgroundColor: '#ffffff' });
    expect(elemento('#guiaImgPalco').getAttribute('aria-hidden')).toBe('true');
    expect(downloads).toEqual([{ nome: '27-11 - SEM MOTORISTA - 05h30 - TST1A03 ARGO - CURITIBA.png', endereco: 'data:image/png;base64,AAAA' }]);
    expect(avisos()).toContain('Imagem baixada. Motorista sem WhatsApp cadastrado (bd_motoristas, coluna E).');
    expect(botao.disabled).toBe(false);
    expect(botao.innerHTML).toBe(desenhoAntes);
    // Baixar a imagem sem mandar ao motorista não marca o aviso como enviado.
    expect(chamadasA(ROTA_AVISO_ENVIADO)).toHaveLength(0);
  });

  it('com WhatsApp, baixa, copia a imagem e abre a conversa do motorista', async () => {
    const abrirJanela = vi.spyOn(window, 'open').mockImplementation(() => ({}) as Window);
    const area = areaDeTransferencia('copia');
    await abrirGuia(diaComWhatsapp());
    clicar(botaoImagem('TST1A03'));
    await esperar(150);
    expect(area.escrever).toHaveBeenCalledTimes(1);
    expect(area.itens).toHaveLength(1);
    expect(item(downloads, 0).nome).toBe('27-11 - PEDRO EXEMPLO - 05h30 - TST1A03 ARGO - CURITIBA.png');
    const endereco = item(item(abrirJanela.mock.calls, 0), 0) as string;
    expect(endereco.startsWith(`https://web.whatsapp.com/send/?phone=55${ZAP_PEDRO}&text=`)).toBe(true);
    expect(decodeURIComponent(endereco)).toContain('Olá, PEDRO EXEMPLO! Segue a guia da sua viagem de 27/11, saída 05:30.');
    expect(avisos()).toContain('Imagem baixada e copiada: na conversa, aperte Ctrl+V e Enter.');
    expect(botaoImagem('TST1A03').disabled).toBe(false);
  });

  it('se o navegador bloqueia a janela, oferece o botão para abrir a conversa', async () => {
    const abrirJanela = vi.spyOn(window, 'open').mockImplementation(() => null);
    areaDeTransferencia('recusa');
    await abrirGuia(diaComWhatsapp());
    tela.guiaImagemViagem(VIAGEM_CURITIBA);
    await esperar(150);
    expect(janelaAberta()).toBe(true);
    expect(textoDaJanela()).toContain('Imagem pronta');
    // A cópia foi recusada: o texto manda arrastar o arquivo baixado.
    expect(textoDaJanela()).toContain('A imagem foi baixada: arraste o arquivo para a conversa.');
    abrirJanela.mockImplementation(() => ({}) as Window);
    clicar(botaoDaJanela('Abrir conversa do motorista'));
    expect(abrirJanela).toHaveBeenCalledTimes(2);
    expect(avisos()).toContain('Imagem baixada: arraste o arquivo para a conversa.');
  });

  it('a cópia que quebra no navegador não impede o download', async () => {
    vi.spyOn(window, 'open').mockImplementation(() => null);
    areaDeTransferencia('quebra');
    await abrirGuia(diaComWhatsapp());
    tela.guiaImagemViagem(VIAGEM_CURITIBA);
    await esperar(150);
    expect(downloads).toHaveLength(1);
    expect(textoDaJanela()).toContain('arraste o arquivo para a conversa');
  });

  it('viagem com dois motoristas: a janela oferece uma conversa para cada um e marca o aviso como enviado', async () => {
    const abrirJanela = vi.spyOn(window, 'open').mockImplementation(() => ({}) as Window);
    areaDeTransferencia('copia');
    apiFalsa(ROTA_AVISO_ENVIADO, () => structuredClone(diaComWhatsapp()));
    await abrirGuia(diaComWhatsapp());
    tela.guiaImagemViagem(VIAGEM_FLORIANOPOLIS, botaoImagem('TST1A01'));
    await esperar(150);
    expect(textoDaJanela()).toContain('Viagem com dois motoristas');
    expect(textoDaJanela()).toContain('A imagem já está copiada: em cada conversa, aperte Ctrl+V e Enter.');
    expect(textos('#guiaModalBox b')).toEqual(['ANTÔNIO FICTÍCIO DA SILVA', 'QUITÉRIA SEGUNDA']);
    expect(textoDaJanela()).toContain('2º motorista · volta · sem WhatsApp cadastrado');
    const enviar = Array.from(document.querySelectorAll<HTMLButtonElement>('#guiaModalBox button')).filter((b) => b.textContent === 'Enviar');
    expect(enviar.map((b) => b.disabled)).toEqual([false, true]);
    clicar(item(enviar, 0));
    const endereco = decodeURIComponent(item(item(abrirJanela.mock.calls, 0), 0) as string);
    expect(endereco).toContain(`phone=55${ZAP_ANTONIO}`);
    expect(endereco).toContain('Nesta viagem são dois motoristas: ANTÔNIO FICTÍCIO DA SILVA na ida e QUITÉRIA SEGUNDA na volta.');
    await esperar();
    expect(chamadasA(ROTA_AVISO_ENVIADO)).toEqual([[DATA_DO_TESTE, 'TST1A01', tela.getOperador(), VIAGEM_FLORIANOPOLIS]]);
  });

  it('dois motoristas sem cópia: a janela manda arrastar a imagem', async () => {
    vi.spyOn(window, 'open').mockImplementation(() => null);
    await abrirGuia(diaComWhatsapp());
    tela.guiaImagemViagem(VIAGEM_FLORIANOPOLIS);
    await esperar(150);
    expect(textoDaJanela()).toContain('A imagem foi baixada: arraste o arquivo para cada conversa.');
    clicar(botaoDaJanela('Fechar'));
    await esperar(300);
    expect(janelaAberta()).toBe(false);
  });

  it('avisa quando a imagem não sai, e ignora carro que não está na tela', async () => {
    areaDeTransferencia('copia');
    await abrirGuia(diaComWhatsapp());
    tela.html2canvas = vi.fn(() => Promise.reject(new Error('falhou o desenho')));
    tela.guiaImagemViagem(VIAGEM_CURITIBA, botaoImagem('TST1A03'));
    await esperar(150);
    expect(avisos()).toContain('Não deu para gerar a imagem. Tente de novo.');
    expect(botaoImagem('TST1A03').disabled).toBe(false);
    expect(downloads).toHaveLength(0);
    // Sem a biblioteca de imagem carregada, o aviso é o mesmo.
    tela.html2canvas = undefined;
    limparAvisos();
    tela.guiaImagemViagem(VIAGEM_CURITIBA);
    await esperar();
    expect(avisos()).toContain('Não deu para gerar a imagem. Tente de novo.');
    limparAvisos();
    tela.guiaImagemViagem('VIAGEM-QUE-NAO-EXISTE');
    expect(avisos()).toContain('Carro não encontrado. Recarregue a tela.');
  });

  it('o botão de WhatsApp do card manda a programação em texto ao motorista', async () => {
    const abrirJanela = vi.spyOn(window, 'open').mockImplementation(() => null);
    await abrirGuia(diaComWhatsapp());
    const zap = elemento('.guia-zap', cardDe('TST1A03'));
    expect(zap.getAttribute('title')).toBe('Enviar programação no WhatsApp para PEDRO EXEMPLO');
    expect(elemento('.guia-zap', cardDe('TST1A01')).getAttribute('title')).toBe(
      'Enviar programação no WhatsApp para ANTÔNIO FICTÍCIO DA SILVA e QUITÉRIA SEGUNDA',
    );
    // O clique de link é falso nestes testes (ele guarda os downloads); o evento de clique roda o onclick do botão.
    zap.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(abrirJanela).toHaveBeenCalledTimes(1);
    const [endereco, alvo] = abrirJanela.mock.calls[0] as [string, string];
    expect(endereco.startsWith(`https://web.whatsapp.com/send/?phone=55${ZAP_PEDRO}&text=`)).toBe(true);
    expect(decodeURIComponent(endereco)).toContain('BRUNO FICTÍCIA DA SILVA 001');
    expect(alvo).toBe('_blank');
    // O carro sem aviso a enviar não chama a API.
    await esperar();
    expect(chamadasA(ROTA_AVISO_ENVIADO)).toHaveLength(0);
  });

  it('a programação em texto com dois motoristas abre a janela de escolha e cobre o motorista sem WhatsApp', async () => {
    const abrirJanela = vi.spyOn(window, 'open').mockImplementation(() => null);
    await abrirGuia(diaComWhatsapp());
    tela.abrirWhatsappGuia(VIAGEM_FLORIANOPOLIS);
    expect(textoDaJanela()).toContain('Viagem com dois motoristas');
    expect(textoDaJanela()).not.toContain('A imagem');
    clicar(Array.from(document.querySelectorAll<HTMLButtonElement>('#guiaModalBox button')).find((b) => b.textContent === 'Enviar') as HTMLButtonElement);
    expect(decodeURIComponent(item(item(abrirJanela.mock.calls, 0), 0) as string)).toContain(`phone=55${ZAP_ANTONIO}`);
    tela.abrirWhatsappGuia(VIAGEM_FLORIANOPOLIS, 2);
    expect(avisos()).toContain('Motorista sem WhatsApp cadastrado (bd_motoristas, coluna E).');
    expect(abrirJanela).toHaveBeenCalledTimes(1);
    tela.abrirWhatsappGuia('VIAGEM-QUE-NAO-EXISTE');
    tela.guiaJanelaDoisMotoristas('VIAGEM-QUE-NAO-EXISTE', 'texto');
    tela.guiaAbrirConversaImagem('VIAGEM-QUE-NAO-EXISTE', false);
    tela.guiaAbrirConversaImagem(VIAGEM_FLORIANOPOLIS, false, 2);
    expect(abrirJanela).toHaveBeenCalledTimes(1);
    // Sem data escolhida, a frase da conversa sai sem o dia.
    elemento<HTMLInputElement>('#gFiltroData').value = '';
    tela.guiaAbrirConversaImagem(VIAGEM_CURITIBA, true);
    expect(decodeURIComponent(item(item(abrirJanela.mock.calls, 1), 0) as string)).toContain('Segue a guia da sua viagem, saída 05:30.');
    expect(textoDaJanela()).toContain('A imagem já está copiada: na conversa, aperte Ctrl+V e Enter.');
    expect(tela.guiaDoisMotoristas(null)).toBe(false);
    expect(tela.guiaTemZap(undefined)).toBe(false);
    expect(tela.guiaNomesMotoristas({})).toBe('motorista');
  });
});

describe('Confirmação e Guias: baixar as guias de todos os carros', () => {
  beforeAll(carregarTelas);
  beforeEach(() => {
    limparChamadas();
    downloads = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push({ nome: this.download, endereco: this.href });
    });
    tela.html2canvas = vi.fn(() => Promise.resolve(canvasFalso()));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    tela.html2canvas = html2canvasOriginal;
    tela.guiaBaixando = false;
    elemento<HTMLButtonElement>('#guiaBaixarBtn').disabled = false;
  });

  function menuAberto(): boolean {
    return elemento('#guiaBaixarMenu').classList.contains('aberto');
  }

  it('o menu conta os carros com passageiro de cada grupo e fecha com clique fora e Esc', async () => {
    const dados = dia();
    dados.veiculosSalvos.push(carroFicticio({ idViagem: 'VIAGEM-VAZIA', placa: 'TST2B02', categoria: 'terceirizado', passageiros: [] }));
    await abrirGuia(dados);
    clicar('#guiaBaixarBtn');
    expect(menuAberto()).toBe(true);
    expect(texto('#guiaBaixarTerc .n')).toBe('1 carro');
    expect(texto('#guiaBaixarServ .n')).toBe('2 carros');
    expect(elemento<HTMLButtonElement>('#guiaBaixarTerc').disabled).toBe(false);
    clicar('#guiaBaixarBtn');
    expect(menuAberto()).toBe(false);
    clicar('#guiaBaixarBtn');
    clicar('#guiaCorpo');
    expect(menuAberto()).toBe(false);
    tela.guiaBaixarMenu();
    expect(menuAberto()).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(menuAberto()).toBe(false);
    // Durante um download, os dois itens ficam desligados.
    tela.guiaBaixando = true;
    tela.guiaBaixarMenu();
    expect(elemento<HTMLButtonElement>('#guiaBaixarServ').disabled).toBe(true);
    tela.guiaFecharMenuBaixar();
  });

  it('baixa a guia de cada carro de servidores pela hora de saída, um arquivo de cada vez', async () => {
    await abrirGuia();
    const botao = elemento<HTMLButtonElement>('#guiaBaixarBtn');
    const desenhoAntes = botao.innerHTML;
    tela.guiaBaixarMenu();
    clicar('#guiaBaixarServ');
    expect(menuAberto()).toBe(false);
    expect(botao.disabled).toBe(true);
    expect(botao.textContent).toBe('Baixando 1 de 2…');
    // Um segundo pedido no meio do download é ignorado.
    tela.guiaBaixarTodas('terceirizado');
    await esperar(1200);
    expect(downloads.map((d) => d.nome)).toEqual([
      '27-11 - ANTÔNIO FICTÍCIO DA SILVA - 04h30 - TST1A01 SPIN - FLORIANÓPOLIS.png',
      '27-11 - SEM MOTORISTA - 05h30 - TST1A03 ARGO - CURITIBA.png',
    ]);
    expect(avisos()).toContain('2 guia(s) de servidores baixada(s). Se o navegador perguntar, permita baixar vários arquivos.');
    expect(botao.disabled).toBe(false);
    expect(botao.innerHTML).toBe(desenhoAntes);
    expect(tela.guiaBaixando).toBe(false);
    // Baixar não é mandar: o aviso do carro continua a enviar.
    expect(chamadasA(ROTA_AVISO_ENVIADO)).toHaveLength(0);
  });

  it('lista os carros que não saíram e avisa quando não há carro do grupo', async () => {
    const dados = dia();
    carroDoDia(dados, VIAGEM_BLUMENAU).horaEmbarque = '';
    dados.veiculosSalvos.push(
      carroFicticio({ idViagem: 'VIAGEM-T2', placa: 'TST2B02', categoria: 'terceirizado', horaEmbarque: '05:00', passageiros: [passageiroFicticio({ matricula: '900040', nome: 'OTÁVIO TERCEIRO' })] }),
    );
    await abrirGuia(dados);
    let pedido = 0;
    tela.html2canvas = vi.fn(() => (++pedido === 2 ? Promise.reject(new Error('falhou')) : Promise.resolve(canvasFalso())));
    tela.guiaBaixarTodas('terceirizado');
    await esperar(800);
    // O carro sem hora vai para o fim e é o que falha.
    expect(downloads.map((d) => d.nome)).toEqual(['27-11 - CARLOS TESTE PEREIRA - 05h00 - TST2B02 SPIN - FLORIANÓPOLIS.png']);
    expect(avisos()).toContain('1 guia(s) de terceiros baixada(s). Não saíram: --:-- TST2B01. Tente de novo.');

    const soServidores = dia();
    soServidores.veiculosSalvos = soServidores.veiculosSalvos.filter((v) => v.categoria !== 'terceirizado');
    await abrirGuia(soServidores);
    tela.guiaBaixarMenu();
    expect(texto('#guiaBaixarTerc .n')).toBe('0 carros');
    expect(elemento<HTMLButtonElement>('#guiaBaixarTerc').disabled).toBe(true);
    tela.guiaBaixarTodas('terceirizado');
    expect(avisos()).toContain('Nenhum carro de terceiros com passageiro neste dia.');
  });

  it('sem a biblioteca de imagem, avisa e destrava o botão', async () => {
    await abrirGuia();
    tela.html2canvas = undefined;
    tela.guiaBaixarTodas('publico');
    expect(avisos()).toContain('Não deu para gerar as imagens. Tente de novo.');
    expect(elemento<HTMLButtonElement>('#guiaBaixarBtn').disabled).toBe(false);
    expect(tela.guiaBaixando).toBe(false);
  });
});

describe('Confirmação e Guias: desenho da guia', () => {
  beforeAll(carregarTelas);
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 26, 12, 0));
  });
  afterEach(() => vi.useRealTimers());

  function desenhar(...argumentos: unknown[]): HTMLElement {
    const caixa = document.createElement('div');
    caixa.innerHTML = tela.guiaImagemHTML(...argumentos);
    return caixa;
  }

  it('desenha o topo, o carro, o aviso e cada paciente da viagem', () => {
    const carro = carroFicticio({
      placa: 'TST1A01',
      tipo: 'spin',
      horaEmbarque: '04:30',
      roteiro: ['ITAJAÍ', 'HOSPITAL DA CIDADE E REGIÃO'],
      bloqueados: 2,
      doisMotoristas: true,
      motoristaAtribuido: 'ANTÔNIO FICTÍCIO',
      whatsappMotorista: '00000000001',
      motorista2: '',
      whatsappMotorista2: '0000000002',
      aviso: 'Levar a cadeira de rodas',
      avisoRegistro: '26/11/2026, 18:53 · Gestora',
      passageiros: [
        passageiroFicticio({
          matricula: '-',
          nome: '-',
          servidorNome: 'LUCAS SERVIDOR',
          servidorMatricula: '7777',
          hora: '10:00',
          cidade: '',
          local: '',
          telefones: '',
          quantidade: 0,
        }),
        passageiroFicticio({
          matricula: '900050',
          nome: 'BEBÊ FICTÍCIO',
          nascimento: '2026-03-20',
          hora: '08:00',
          acompanhante: 'MÃE FICTÍCIA',
          telefonesAcomp: '(00) 00000-5050 / 123',
          telefones: '(00) 0000-1050',
          enderecoEmbarque: 'Endereço do paciente',
          enderecoResidencia: 'RUA FICTÍCIA 50, 150',
          local: 'HOSPITAL INFANTIL JOANA DE GUSMAO',
          pedidoCancelado: true,
          observacao: 'Levar o carrinho',
          quantidade: 2,
        }),
        passageiroFicticio({ matricula: '900051', nome: 'SEM HORA', hora: '', nascimento: '1950-05-05', quantidade: 1 }),
      ],
    });
    const guia = desenhar(carro, DATA_DO_TESTE, 'Gestora Fictícia', new Date(2026, 10, 26, 9, 5));
    const ler = (seletor: string) => textos(seletor, guia);
    expect(ler('.gimg-marca')).toEqual(['SIGEPAS · GUIA DE VIAGEM']);
    expect(ler('.gimg-data')).toEqual(['sexta-feira · 27/11/2026']);
    expect(ler('.gimg-saida')).toEqual(['SAÍDA04:30']);
    expect(ler('.gimg-destino')).toEqual(['DESTINO PRINCIPALHOSPITAL DA CIDADE E REGIÃO']);
    expect(ler('.gimg-rota')).toEqual(['ROTA: Joinville → Itajaí → Hospital da Cidade e Região']);
    expect(ler('.gimg-chip')).toEqual(['SPIN', 'TST1A01', 'Público', '3/6 lugares', '2 bloqueados']);
    expect(ler('.gimg-mrow')).toEqual([
      'Motorista (ida)ANTÔNIO FICTÍCIO · 00 00000-0001',
      'Motorista (volta)(a definir) · 00 0000-0002',
      'PartidaSecretaria da Saúde',
    ]);
    expect(ler('.gimg-aviso-txt')).toEqual(['Levar a cadeira de rodas']);
    expect(ler('.gimg-aviso-meta')).toEqual(['Registrado em 26/11/2026, 18:53 · Gestora']);
    expect(ler('.gimg-sec span')).toEqual(['3 pacientes · 3 passageiros']);
    // Pacientes pela hora; o sem hora vem primeiro, como "--:--".
    expect(ler('.gimg-hora')).toEqual(['--:--', '08:00', '10:00']);
    const cartoes = Array.from(guia.querySelectorAll('.gimg-card'));
    expect(cartoes.map((c) => c.className)).toEqual(['gimg-card gimg-cor-1 gimg-card-perigo', 'gimg-card gimg-cor-2 gimg-card-perigo', 'gimg-card gimg-cor-3']);
    const bebe = item(cartoes, 1);
    expect(textos('.gimg-meta', bebe)).toEqual(['8 meses · mat. 900050']);
    expect(textos('.gimg-tag', bebe)).toEqual(['Bebê Conforto', 'FLORIANÓPOLIS']);
    expect(bebe.textContent).toContain('AtendimentoHospital Infantil Joana de Gusmao');
    expect(bebe.textContent).toContain('EmbarqueRUA FICTÍCIA 50, 150');
    expect(bebe.textContent).toContain('Contato00 0000-1050');
    expect(textos('.gimg-nw', bebe)).toEqual(['00 0000-1050', '00 00000-5050', '123']);
    expect(textos('.gimg-faixa', bebe)).toEqual(['PEDIDO CANCELADO NO POSTO · confira antes de sair', 'Levar o carrinho']);
    const servidor = item(cartoes, 2);
    expect(textos('.gimg-nome', servidor)).toEqual(['SERVIDORLUCAS SERVIDOR']);
    expect(textos('.gimg-meta', servidor)).toEqual(['mat. 7777']);
    expect(servidor.textContent).toContain('Atendimento—');
    expect(servidor.textContent).toContain('Contato—');
    expect(servidor.textContent).toContain('AcompanhanteSem acompanhante');
    expect(textos('.gimg-tag-cidade', servidor)).toEqual([]);
    expect(textos('.gimg-tag', item(cartoes, 0))).toEqual(['⚠️ IDOSO SEM ACOMPANHANTE', 'FLORIANÓPOLIS']);
    expect(ler('.gimg-rodape span')).toEqual(['Gerado em 26/11/2026 09:05 · Gestora Fictícia']);
  });

  it('desenha a guia da remoção interna e a viagem sem paciente', () => {
    const carro = carroFicticio({
      placa: 'TST1A05',
      tipo: '',
      horaEmbarque: '',
      localEmbarque: '',
      bloqueados: 1,
      passageiros: [passageiroFicticio({ matricula: '900060', nome: 'RITA INTERNA', enderecoEmbarque: 'RUA FICTÍCIA 60', quantidade: 1 })],
    });
    const interna = desenhar(carro, 'sem-data', '', null, { interna: true, destino: 'UBSF CENTRO', kickerDestino: 'DESTINOS', rota: 'Centro → UBSF Centro' });
    const ler = (seletor: string) => textos(seletor, interna);
    expect(ler('.gimg-marca')).toEqual(['SIGEPAS · GUIA DE REMOÇÃO INTERNA']);
    expect(ler('.gimg-data')).toEqual(['']);
    expect(ler('.gimg-saida')).toEqual(['SAÍDA--:--']);
    expect(ler('.gimg-destino')).toEqual(['DESTINOSUBSF CENTRO']);
    expect(ler('.gimg-rota')).toEqual(['ROTA: Centro → UBSF Centro']);
    expect(ler('.gimg-chip')).toEqual(['—', 'TST1A05', 'Remoção interna', '1 passageiro', '1 bloqueado']);
    expect(interna.textContent).toContain('EndereçoRUA FICTÍCIA 60');
    expect(ler('.gimg-mrow')).toEqual(['MotoristaCARLOS TESTE PEREIRA']);
    expect(ler('.gimg-rodape span')).toEqual(['Gerado em']);

    const semDestino = desenhar(carroFicticio({ destino: '', roteiro: [], categoria: 'terceirizado', passageiros: undefined, limite: 0 }), DATA_DO_TESTE, '', null, { interna: true });
    expect(textos('.gimg-destino', semDestino)).toEqual(['DESTINOSEM DESTINO']);
    expect(semDestino.querySelector('.gimg-rota')).toBeNull();
    const vazia = desenhar(carroFicticio({ destino: '', roteiro: [], categoria: 'terceirizado', passageiros: [], limite: 0 }), DATA_DO_TESTE);
    expect(textos('.gimg-destino', vazia)).toEqual(['DESTINO PRINCIPALSEM DESTINO']);
    expect(textos('.gimg-chip', vazia)).toEqual(['SPIN', 'TST9X99', 'Terceirizado', '0/4 lugares']);
    expect(textos('.gimg-vazio', vazia)).toEqual(['Nenhum paciente.']);
    expect(textos('.gimg-sec span', vazia)).toEqual(['0 pacientes · 0 passageiros']);
    expect(textos('.gimg-rota', vazia)).toEqual(['ROTA: Joinville']);
  });

  it('monta o nome do arquivo, os telefones, os títulos e as idades da guia', () => {
    expect(tela.guiaNomeArquivoImagem({ placa: 'TST1A01', tipo: 'spin', motoristaAtribuido: ' joão: "teste"/a ', horaEmbarque: '04:30', destino: 'Itajaí' }, '2026-11-27')).toBe(
      '27-11 - JOÃO TESTE A - 04h30 - TST1A01 SPIN - ITAJAÍ.png',
    );
    expect(tela.guiaNomeArquivoImagem({ placa: '', tipo: '', destino: '' }, '')).toBe('SEM DATA - SEM MOTORISTA - SEM HORA - SEM DESTINO.png');
    expect(tela.guiaFoneImagem('')).toBe('');
    expect(tela.guiaFoneImagem('(00) 0000-1234 / x')).toBe('<span class="gimg-nw">00 0000-1234</span> / <span class="gimg-nw">x</span>');
    expect(tela.guiaTituloImagem('HOSPITAL DOS OLHOS DAS FLORES DO MAR E DE SANTA CATARINA DA SILVA')).toBe(
      'Hospital dos Olhos das Flores do Mar e de Santa Catarina da Silva',
    );
    expect(tela.guiaIdadeImagem('')).toBe('');
    expect(tela.guiaIdadeImagem('2026-11-20')).toBe('menos de 1 mês');
    expect(tela.guiaIdadeImagem('2026-10-20')).toBe('1 mês');
    expect(tela.guiaIdadeImagem('2025-10-20')).toBe('1 ano');
    expect(tela.guiaIdadeImagem('2000-01-01')).toBe('26 anos');
    expect(tela.escGuia(0)).toBe('');
    expect(tela.escGuia('a & "b" <c>')).toBe('a &amp; &quot;b&quot; &lt;c&gt;');
  });

  it('identifica o passageiro pela matrícula, pelo nome, pelo pedido ou pela linha', () => {
    expect(tela.guiaIdPax({ matricula: ' 900001 ', nome: 'Ana' })).toBe('900001');
    expect(tela.guiaIdPax({ matricula: 'não informado', nome: 'Ana Teste' })).toBe('ANA TESTE');
    expect(tela.guiaIdPax({ matricula: '-', nome: '-', chaveDemanda: 'd-1' })).toBe('#D-1');
    expect(tela.guiaIdPax({ matricula: 'NA', nome: 'Sem Informação', idLinha: '12' })).toBe('@12');
    expect(tela.guiaIdPax({ matricula: '', nome: '' })).toBe('');
    expect(tela.guiaNomePax({ matricula: '-', nome: '-', servidorNome: '-' })).toBe('Servidor');
    expect(tela.guiaNomePax({ matricula: '1', nome: undefined })).toBe('');
    // A chave antiga (matrícula crua, inclusive "-") ainda acha o passageiro.
    const lista = [{ matricula: '-', nome: '-', chaveDemanda: 'D-9' }, { matricula: '900002', nome: 'Bia' }];
    expect(tela.guiaAcharPax(lista, '#d-9')).toBe(lista[0]);
    expect(tela.guiaAcharPax(lista, '-')).toBe(lista[0]);
    expect(tela.guiaAcharPax(lista, null)).toBeUndefined();
    expect(tela.guiaAcharPax(undefined, '900002')).toBeUndefined();
    expect(tela.carroDaChave('')).toBeNull();
    expect(tela.chaveCarroGuia(null)).toBe('');
    expect(tela.chaveCarroGuia({ placa: 'TST1A01' })).toBe('TST1A01');
    expect(tela.destinoDe({ roteiro: ['ITAJAÍ', 'BLUMENAU'] })).toBe('BLUMENAU');
    expect(tela.guiaTemAcento('Itajaí')).toBe(true);
    expect(tela.guiaNormCid(null)).toBe('');
    expect(tela.guiaNormBusca(undefined)).toBe('');
  });
});
