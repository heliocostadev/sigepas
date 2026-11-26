import { apiFalha, carregarTelas, chamadasA, clicar, esperar, limparChamadas, tela, texto } from './preparar-telas';

describe('página das telas: ponte com a API, abas e avisos', () => {
  beforeAll(carregarTelas);
  beforeEach(limparChamadas);

  it('cada função do Apps Script vai para a rota da API, com os argumentos em ordem', async () => {
    const sucesso = vi.fn();
    tela.chamarServidor('getDadosOperacao', ['2026-11-27'], sucesso, vi.fn(), 'objeto');
    await esperar();
    expect(chamadasA('/api/operacao/dados-do-dia')).toEqual([['2026-11-27']]);
    expect(sucesso).toHaveBeenCalledWith(expect.objectContaining({ _dataISO: '2026-11-27' }), 'objeto');
  });

  it('erro da API chega à tela com a mensagem do servidor', async () => {
    apiFalha('/api/operacao/montar-carros', 409, 'Este carro já sai às 05:00.');
    const falha = vi.fn();
    tela.chamarServidor('salvarViagensAlocadas', [{}], vi.fn(), falha);
    await esperar();
    expect((falha.mock.calls[0]?.[0] as Error).message).toBe('Este carro já sai às 05:00.');
  });

  it('função sem rota e função fora desta entrega avisam em vez de quebrar', async () => {
    const falha = vi.fn();
    tela.chamarServidor('funcaoQueNaoExiste', [], vi.fn(), falha);
    tela.chamarServidor('previewCalendario', [], vi.fn(), falha);
    tela.chamarServidor('importarCalendario', [], vi.fn());
    await esperar();
    expect((falha.mock.calls[0]?.[0] as Error).message).toContain('sem rota');
    expect((falha.mock.calls[1]?.[0] as Error).message).toContain('calendário');
  });

  it('a chamada montada antes escolhe a função depois', async () => {
    const sucesso = vi.fn();
    (tela.criarChamadaAoServidor(sucesso, vi.fn()) as Record<string, (...a: unknown[]) => void>).salvarEdicaoPaciente('P1', 'Local', '', 2);
    await esperar();
    expect(chamadasA('/api/operacao/editar-pedido')).toEqual([['P1', 'Local', '', 2]]);
    expect(sucesso).toHaveBeenCalled();
  });

  it('mostra o nome de quem entrou e troca de aba pelo menu', async () => {
    tela.carregarUsuario();
    await esperar();
    expect(texto('#navbarOperador')).toContain('Gestora Fictícia (gestor)');
    expect(tela.getOperador()).toBe('Gestora Fictícia');
    clicar(document.querySelectorAll('.ds-nav-aba')[5] as Element);
    expect(tela.abaAtiva()).toBe('aba3');
  });

  it('aviso rápido aparece e some sozinho', async () => {
    tela.toast('Gravado.', 'sucesso');
    tela.toast('Tipo estranho', 'qualquer');
    expect(document.querySelectorAll('#toastArea .ds-toast--ok').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('#toastArea .ds-toast--info').length).toBeGreaterThan(0);
  });

  it('janela de confirmação roda a ação só no botão de confirmar, e o Esc fecha', () => {
    const aoConfirmar = vi.fn((fechar: () => void) => fechar());
    const aoCancelar = vi.fn();
    tela.dsConfirmar({ titulo: 'Apagar?', corpo: '<p>Teste</p>', ok: 'Apagar', classeOk: 'perigo', aoConfirmar, aoCancelar });
    expect(texto('#dsConfTit')).toBe('Apagar?');
    clicar('#dsConfOk');
    expect(aoConfirmar).toHaveBeenCalled();
    tela.dsConfirmar({ titulo: 'De novo', aoCancelar });
    clicar('#dsConfNao');
    expect(aoCancelar).toHaveBeenCalled();
    tela.dsConfirmar({ titulo: 'Sem ação' });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.getElementById('dsConfirma')?.classList.contains('aberto')).toBe(false);
    clicar('#dsConfirma');
  });

  it('guarda a última carga do dia e só pede de novo se a versão mudou', async () => {
    const chegou = vi.fn();
    tela.cargaDiaPedir({ data: '2026-11-27', lembrar: false }, chegou, vi.fn());
    await esperar();
    expect(tela.cargaDiaTem('2026-11-27')).toBe(true);
    tela.cargaDiaPedir({ data: '2026-11-27', lembrar: true }, chegou, vi.fn());
    await esperar();
    expect(chegou.mock.calls.map((c) => c[1])).toEqual(['servidor', 'lembrada', 'nova']);
    tela.cargaDiaEsquecer(['2026-11-27']);
    expect(tela.cargaDiaTem('2026-11-27')).toBe(false);
    apiFalha('/api/operacao/dados-do-dia', 500, 'Banco fora do ar');
    const falhou = vi.fn();
    tela.cargaDiaPedir({ data: '2026-11-28', lembrar: true }, vi.fn(), falhou);
    await esperar();
    expect(falhou).toHaveBeenCalled();
    expect(String(tela.dataPadraoISO())).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(tela.dsEsc('<b>"x"</b>')).toBe('&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
  });
});
