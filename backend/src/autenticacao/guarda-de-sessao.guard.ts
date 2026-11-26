import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lerTokenDaSessao } from './cookie-da-sessao';
import { ROTA_PUBLICA, SO_GESTOR, type RequisicaoComConta } from './decoradores';
import { SessoesService } from './sessoes.service';

const METODOS_DE_LEITURA = new Set(['GET', 'HEAD', 'OPTIONS']);

// Toda rota exige sessão, menos as marcadas com @Publica. A proteção contra CSRF tem duas camadas: o cookie é
// SameSite=Strict, e toda escrita precisa vir com Content-Type application/json. Um formulário de outro site não
// consegue mandar esse tipo sem passar pelo CORS, que está fechado para outras origens.
@Injectable()
export class GuardaDeSessao implements CanActivate {
  constructor(
    private readonly refletor: Reflector,
    private readonly sessoes: SessoesService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const requisicao = contexto.switchToHttp().getRequest<RequisicaoComConta>();
    const alvos = [contexto.getHandler(), contexto.getClass()];
    if (!METODOS_DE_LEITURA.has(requisicao.method) && !requisicao.is('application/json')) {
      throw new ForbiddenException('Envie os dados em JSON.');
    }
    if (this.refletor.getAllAndOverride<boolean>(ROTA_PUBLICA, alvos)) return true;
    const token = lerTokenDaSessao(requisicao);
    const conta = token ? await this.sessoes.conferir(token) : null;
    if (!conta) throw new UnauthorizedException('Sua sessão terminou. Entre de novo.');
    if (this.refletor.getAllAndOverride<boolean>(SO_GESTOR, alvos) && conta.papel !== 'GESTOR') {
      throw new ForbiddenException('Só o gestor pode fazer esta alteração.');
    }
    requisicao.conta = conta;
    return true;
  }
}
