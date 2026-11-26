import type { Request, Response } from 'express';

// Prefixo __Host-: o navegador só aceita o cookie com Secure, Path=/ e sem Domain. Sem Max-Age: o cookie é de sessão
// do navegador. Quem corta a sessão é o servidor, pelos prazos de sessoes.service.ts.
export const NOME_DO_COOKIE = '__Host-sigepas_sessao';
const OPCOES = { httpOnly: true, secure: true, sameSite: 'strict' as const, path: '/' };
const FORMATO_DO_TOKEN = /^[\w-]{20,100}$/;

export function lerTokenDaSessao(requisicao: Request): string | null {
  const cabecalho = requisicao.headers.cookie ?? '';
  for (const parte of cabecalho.split(';')) {
    const [nome, ...valor] = parte.trim().split('=');
    if (nome === NOME_DO_COOKIE) {
      const token = valor.join('=');
      return FORMATO_DO_TOKEN.test(token) ? token : null;
    }
  }
  return null;
}

export function gravarCookieDaSessao(resposta: Response, token: string): void {
  resposta.cookie(NOME_DO_COOKIE, token, OPCOES);
}

export function apagarCookieDaSessao(resposta: Response): void {
  resposta.clearCookie(NOME_DO_COOKIE, OPCOES);
}
