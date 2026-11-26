import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';

// Qual aba do navegador fez a requisição (cabeçalho X-Id-Da-Tela). O aviso de mudança leva esse identificador, e a aba
// que gravou não recarrega o que já desenhou. Só identifica a aba: não dá permissão nenhuma.
const telaDaRequisicao = new AsyncLocalStorage<string>();
const FORMATO_DO_ID = /^[\w-]{1,64}$/;

export function guardarTelaDeOrigem(requisicao: Request, _resposta: Response, seguir: NextFunction): void {
  const id = requisicao.header('x-id-da-tela') ?? '';
  telaDaRequisicao.run(FORMATO_DO_ID.test(id) ? id : '', seguir);
}

export function telaDeOrigem(): string {
  return telaDaRequisicao.getStore() ?? '';
}
