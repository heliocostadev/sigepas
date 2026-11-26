import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ENDERECO_DAS_TELAS, PaginaInicial } from './PaginaInicial';

function respostaCom(status: number): Response {
  return { ok: status >= 200 && status < 300, status } as Response;
}

function preencherEEntrar() {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'operador@exemplo.org' } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-ficticia-123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('PaginaInicial (tela de entrada)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
  });

  it('mostra o nome do sistema, a sigla explicada e o formulário de entrada', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaCom(401)));
    render(<PaginaInicial navegar={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'SIGEPAS' })).toBeInTheDocument();
    expect(screen.getByText('Sistema de Gestão de Transportes de Pacientes e Servidores')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Entrar no sistema' })).toBeInTheDocument();
  });

  it('quem já tem sessão vai direto para as telas', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaCom(200)));
    const navegar = vi.fn();
    render(<PaginaInicial navegar={navegar} />);
    await waitFor(() => expect(navegar).toHaveBeenCalledWith(ENDERECO_DAS_TELAS));
  });

  it('entra com e-mail e senha certos e manda os dados em JSON', async () => {
    const buscar = vi.fn().mockResolvedValueOnce(respostaCom(401)).mockResolvedValueOnce(respostaCom(200));
    vi.stubGlobal('fetch', buscar);
    const navegar = vi.fn();
    render(<PaginaInicial navegar={navegar} />);
    preencherEEntrar();
    await waitFor(() => expect(navegar).toHaveBeenCalledWith(ENDERECO_DAS_TELAS));
    const [rota, opcoes] = buscar.mock.calls[1] as [string, RequestInit];
    expect(rota).toBe('/api/autenticacao/entrar');
    expect(opcoes.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(String(opcoes.body))).toEqual({ email: 'operador@exemplo.org', senha: 'senha-ficticia-123' });
  });

  it.each([
    [401, 'E-mail ou senha não conferem.'],
    [429, 'Muitas tentativas. Espere um minuto e tente de novo.'],
  ])('com a resposta %i, avisa sem sair da tela', async (status, aviso) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(respostaCom(401)).mockResolvedValueOnce(respostaCom(status)));
    const navegar = vi.fn();
    render(<PaginaInicial navegar={navegar} />);
    preencherEEntrar();
    expect(await screen.findByText(aviso)).toBeInTheDocument();
    expect(navegar).not.toHaveBeenCalled();
  });

  it('avisa quando o servidor não responde', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('rede')));
    render(<PaginaInicial navegar={vi.fn()} />);
    preencherEEntrar();
    expect(await screen.findByText('Sem conexão com o servidor. Confira a internet e tente de novo.')).toBeInTheDocument();
  });

  it('explica quando a sessão terminou', () => {
    window.history.replaceState(null, '', '/?sessao=terminou');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaCom(401)));
    render(<PaginaInicial navegar={vi.fn()} />);
    expect(screen.getByText('Sua sessão terminou. Entre de novo.')).toBeInTheDocument();
  });
});
