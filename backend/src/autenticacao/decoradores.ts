import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { ContaDaSessao } from './sessoes.service';

export const ROTA_PUBLICA = 'rota-publica';
export const SO_GESTOR = 'so-gestor';

// Rota que não exige login (saúde e entrada).
export const Publica = () => SetMetadata(ROTA_PUBLICA, true);
// Rota que só o papel gestor usa (cadastros e configurações).
export const SoGestor = () => SetMetadata(SO_GESTOR, true);

export type RequisicaoComConta = Request & { conta?: ContaDaSessao };

export function contaDaRequisicao(contexto: ExecutionContext): ContaDaSessao {
  const requisicao = contexto.switchToHttp().getRequest<RequisicaoComConta>();
  if (!requisicao.conta) throw new Error('Rota sem sessão: a guarda de sessão não rodou.');
  return requisicao.conta;
}

// A conta que fez a requisição. A guarda de sessão já garantiu que ela existe.
export const ContaAtual = createParamDecorator((_dado: unknown, contexto: ExecutionContext) => contaDaRequisicao(contexto));
