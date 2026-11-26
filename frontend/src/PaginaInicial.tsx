import { useEffect, useState, type FormEvent } from 'react';

// Tela de entrada do SIGEPAS. Quem já tem sessão vai direto para as telas do sistema (/sistema/), trazidas do SIGEPAS em
// Apps Script (ADR 0016). A sessão fica no servidor; o navegador guarda só um cookie HttpOnly.
export const ENDERECO_DAS_TELAS = '/sistema/';

export function irPara(endereco: string): void {
  window.location.assign(endereco);
}

export function PaginaInicial({ navegar = irPara }: { navegar?: (endereco: string) => void }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mensagem, setMensagem] = useState(() =>
    new URLSearchParams(window.location.search).get('sessao') === 'terminou' ? 'Sua sessão terminou. Entre de novo.' : '',
  );
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch('/api/autenticacao/eu', { credentials: 'same-origin' })
      .then((resposta) => {
        if (resposta.ok) navegar(ENDERECO_DAS_TELAS);
      })
      .catch(() => undefined);
  }, [navegar]);

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setMensagem('');
    try {
      const resposta = await fetch('/api/autenticacao/entrar', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });
      if (resposta.ok) {
        navegar(ENDERECO_DAS_TELAS);
        return;
      }
      setMensagem(
        resposta.status === 429
          ? 'Muitas tentativas. Espere um minuto e tente de novo.'
          : 'E-mail ou senha não conferem.',
      );
    } catch {
      setMensagem('Sem conexão com o servidor. Confira a internet e tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="entrada">
      <h1>SIGEPAS</h1>
      <p>Sistema de Gestão de Transportes de Pacientes e Servidores</p>
      <form onSubmit={entrar} aria-label="Entrar no sistema">
        <label htmlFor="email">E-mail</label>
        <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="senha">Senha</label>
        <input id="senha" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
        <button type="submit" disabled={enviando}>{enviando ? 'Entrando...' : 'Entrar'}</button>
        <p role="alert" className="entrada-mensagem">{mensagem}</p>
      </form>
    </main>
  );
}
