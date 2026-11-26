// Tempo real entre as telas (ADR 0016): cada aviso de mudança da API recarrega só o que está aberto e mudou.
import { carregarTelas, chamadasA, esperar, limparChamadas, tela } from './preparar-telas';

class FonteFalsa {
  static ultima: FonteFalsa | undefined;
  ouvintes: Record<string, (evento: { data: string }) => void> = {};
  onerror: (() => void) | null = null;
  fechada = false;
  constructor(public endereco: string) {
    FonteFalsa.ultima = this;
  }
  addEventListener(tipo: string, ouvinte: (evento: { data: string }) => void) {
    this.ouvintes[tipo] = ouvinte;
  }
  close() {
    this.fechada = true;
  }
  avisar(mudanca: object | string) {
    this.ouvintes['mudanca']?.({ data: typeof mudanca === 'string' ? mudanca : JSON.stringify(mudanca) });
  }
}

function abrirAba(id: string, indice: number) {
  tela.mudarAba(id, document.querySelectorAll('.ds-nav-aba')[indice]);
}

describe('tempo real', () => {
  beforeAll(async () => {
    vi.stubGlobal('EventSource', FonteFalsa);
    await carregarTelas();
    window.dispatchEvent(new Event('load'));
  });
  beforeEach(limparChamadas);

  it('abre o canal /api/eventos e ignora o aviso da própria aba e o aviso malformado', async () => {
    const fonte = FonteFalsa.ultima as FonteFalsa;
    expect(fonte.endereco).toBe('/api/eventos');
    abrirAba('demandas', 1);
    await esperar();
    limparChamadas();
    fonte.avisar({ assunto: 'operacao', datas: [tela.estadoDm.data], origem: tela.ID_DA_TELA });
    fonte.avisar('isto não é JSON');
    await esperar();
    expect(chamadasA('/api/operacao/dados-do-dia')).toEqual([]);
  });

  it('Viagens Externas recarrega o dia que mudou e desfaz a seleção', async () => {
    const fonte = FonteFalsa.ultima as FonteFalsa;
    abrirAba('demandas', 1);
    await esperar();
    limparChamadas();
    tela.estadoDm.selecionados = { P1: true };
    fonte.avisar({ assunto: 'operacao', datas: ['2001-01-01'], origem: 'outra' });
    await esperar();
    expect(chamadasA('/api/operacao/dados-do-dia')).toEqual([]);
    fonte.avisar({ assunto: 'operacao', datas: [tela.estadoDm.data], origem: 'outra', quemGravou: 'Outra pessoa' });
    await esperar();
    expect(chamadasA('/api/operacao/dados-do-dia')).toEqual([[tela.estadoDm.data]]);
    expect(Object.keys(tela.estadoDm.selecionados)).toEqual([]);
    expect(document.getElementById('toastArea')?.textContent).toContain('Outra pessoa gravou neste dia');
  });

  it('Confirmação e Guias recarrega o dia que está na tela', async () => {
    const fonte = FonteFalsa.ultima as FonteFalsa;
    abrirAba('guia', 2);
    await esperar();
    limparChamadas();
    const data = (document.getElementById('gFiltroData') as HTMLInputElement).value;
    fonte.avisar({ assunto: 'operacao', datas: [data], origem: 'outra' });
    await esperar();
    expect(chamadasA('/api/operacao/dados-do-dia')).toEqual([[data]]);
  });

  it('Escala de Viagens recarrega sem mudança pendente e só avisa com mudança pendente', async () => {
    const fonte = FonteFalsa.ultima as FonteFalsa;
    abrirAba('escala', 3);
    await esperar();
    limparChamadas();
    const data = (document.getElementById('escFData') as HTMLInputElement).value;
    const pendencias = tela.escPendencias;
    tela.escPendencias = () => 0;
    fonte.avisar({ assunto: 'escala', datas: [data], origem: 'outra' });
    await esperar();
    expect(chamadasA('/api/escala/dados-para-formacao').length).toBe(1);
    tela.escPendencias = () => 2;
    limparChamadas();
    fonte.avisar({ assunto: 'operacao', datas: [data], origem: 'outra' });
    await esperar();
    expect(chamadasA('/api/escala/dados-para-formacao')).toEqual([]);
    expect(document.getElementById('toastArea')?.textContent).toContain('Grave as suas mudanças');
    tela.escPendencias = pendencias;
  });

  it('Escala para Enviar e Configurações recarregam; o contador de locais também', async () => {
    const fonte = FonteFalsa.ultima as FonteFalsa;
    abrirAba('escalaEnviar', 4);
    await esperar();
    limparChamadas();
    fonte.avisar({ assunto: 'escala', datas: [], origem: 'outra' });
    await esperar();
    expect(chamadasA('/api/escala/escala-do-periodo').length).toBe(1);
    abrirAba('aba3', 5);
    await esperar();
    limparChamadas();
    fonte.avisar({ assunto: 'cadastros', datas: [], origem: 'outra' });
    fonte.avisar({ assunto: 'padronizacao', datas: [], origem: 'outra' });
    await esperar();
    expect(chamadasA('/api/cadastros/dados').length).toBeGreaterThan(0);
    expect(chamadasA('/api/importacao/locais-pendentes').length).toBe(1);
  });

  it('se a conexão cai, fecha e tenta de novo depois de alguns segundos', () => {
    vi.useFakeTimers();
    const fonte = FonteFalsa.ultima as FonteFalsa;
    fonte.onerror?.();
    expect(fonte.fechada).toBe(true);
    vi.advanceTimersByTime(5000);
    expect(FonteFalsa.ultima).not.toBe(fonte);
    vi.useRealTimers();
  });
});
