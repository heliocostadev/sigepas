import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { apagarCookieDaSessao, gravarCookieDaSessao, lerTokenDaSessao } from './cookie-da-sessao';
import { ContaAtual, Publica } from './decoradores';
import { TAMANHO_MAXIMO_DA_SENHA } from './senha';
import { SessoesService, type ContaDaSessao } from './sessoes.service';

const TAMANHO_MAXIMO_DO_EMAIL = 254;

@Controller('autenticacao')
export class AutenticacaoController {
  constructor(private readonly sessoes: SessoesService) {}

  // No máximo 10 tentativas de entrada por minuto por endereço (OWASP ASVS 2.2.1).
  @Publica()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('entrar')
  @HttpCode(200)
  async entrar(
    @Body() corpo: { email?: unknown; senha?: unknown } | undefined,
    @Res({ passthrough: true }) resposta: Response,
  ): Promise<{ nome: string; papel: string }> {
    const email = corpo?.email;
    const senha = corpo?.senha;
    if (
      typeof email !== 'string' ||
      typeof senha !== 'string' ||
      email.length > TAMANHO_MAXIMO_DO_EMAIL ||
      senha.length > TAMANHO_MAXIMO_DA_SENHA
    ) {
      throw new BadRequestException('Informe o e-mail e a senha.');
    }
    const resultado = await this.sessoes.entrar(email, senha);
    if (!resultado) throw new UnauthorizedException('E-mail ou senha não conferem.');
    gravarCookieDaSessao(resposta, resultado.token);
    return { nome: resultado.conta.nome, papel: resultado.conta.papel };
  }

  @Publica()
  @Post('sair')
  @HttpCode(204)
  async sair(@Req() requisicao: Request, @Res({ passthrough: true }) resposta: Response): Promise<void> {
    const token = lerTokenDaSessao(requisicao);
    if (token) await this.sessoes.sair(token);
    apagarCookieDaSessao(resposta);
    resposta.setHeader('Clear-Site-Data', '"cookies"');
  }

  @Get('eu')
  quemSou(@ContaAtual() conta: ContaDaSessao): { email: string; nome: string; papel: string } {
    return { email: conta.email, nome: conta.nome, papel: conta.papel };
  }
}
