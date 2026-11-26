import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { BancoDeDadosService } from '../banco-de-dados/banco-de-dados.service';
import type { Papel } from '../gerado/prisma/client';
import { conferirSenha } from './senha';

// Prazos da sessão no servidor (ADR 0015). Sem uso por 2 horas, a sessão vence. Com uso, ela dura no máximo 12 horas,
// que é um turno longo do setor.
export const PRAZO_SEM_USO_EM_MILISSEGUNDOS = 2 * 60 * 60 * 1000;
export const PRAZO_MAXIMO_EM_MILISSEGUNDOS = 12 * 60 * 60 * 1000;
// A data do último uso só é regravada depois de um minuto, para cada requisição não virar uma escrita no banco.
const INTERVALO_PARA_REGRAVAR_O_USO = 60 * 1000;

export interface ContaDaSessao {
  id: number;
  email: string;
  nome: string;
  papel: Papel;
}

export function resumirToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Hash scrypt de uma senha que ninguém conhece. Só serve para gastar o mesmo tempo quando a conta não existe.
const HASH_PARA_CONTA_INEXISTENTE = `scrypt$131072$8$1$c2lnZXBhcy1zZW0tY29udGE=$${Buffer.alloc(64, 7).toString('base64')}`;

@Injectable()
export class SessoesService {
  constructor(private readonly banco: BancoDeDadosService) {}

  // Confere e-mail e senha. Devolve o token novo, que só o navegador guarda. O banco guarda o resumo SHA-256 dele.
  async entrar(email: string, senha: string): Promise<{ token: string; conta: ContaDaSessao } | null> {
    const conta = await this.banco.cliente.conta.findUnique({ where: { email: email.trim().toLowerCase() } });
    // Sem conta, a senha é conferida contra um hash falso, para o tempo de resposta não revelar quais e-mails existem.
    const confere = await conferirSenha(senha, conta?.ativa ? conta.hashDaSenha : HASH_PARA_CONTA_INEXISTENTE);
    if (!conta?.ativa || !confere) return null;
    const token = randomBytes(32).toString('base64url');
    const agora = Date.now();
    // Sessões vencidas de qualquer conta saem do banco na entrada (LGPD: não guardar além do necessário).
    await this.banco.cliente.sessao.deleteMany({
      where: {
        OR: [
          { ultimoUsoEm: { lt: new Date(agora - PRAZO_SEM_USO_EM_MILISSEGUNDOS) } },
          { criadaEm: { lt: new Date(agora - PRAZO_MAXIMO_EM_MILISSEGUNDOS) } },
        ],
      },
    });
    await this.banco.cliente.sessao.create({ data: { id: resumirToken(token), contaId: conta.id } });
    return { token, conta: { id: conta.id, email: conta.email, nome: conta.nome, papel: conta.papel } };
  }

  async conferir(token: string): Promise<ContaDaSessao | null> {
    const sessao = await this.banco.cliente.sessao.findUnique({
      where: { id: resumirToken(token) },
      include: { conta: true },
    });
    if (!sessao?.conta.ativa) return null;
    const agora = Date.now();
    const venceuSemUso = agora - sessao.ultimoUsoEm.getTime() > PRAZO_SEM_USO_EM_MILISSEGUNDOS;
    const venceuPeloPrazo = agora - sessao.criadaEm.getTime() > PRAZO_MAXIMO_EM_MILISSEGUNDOS;
    if (venceuSemUso || venceuPeloPrazo) {
      await this.banco.cliente.sessao.deleteMany({ where: { id: sessao.id } });
      return null;
    }
    if (agora - sessao.ultimoUsoEm.getTime() > INTERVALO_PARA_REGRAVAR_O_USO) {
      await this.banco.cliente.sessao.update({ where: { id: sessao.id }, data: { ultimoUsoEm: new Date(agora) } });
    }
    const { conta } = sessao;
    return { id: conta.id, email: conta.email, nome: conta.nome, papel: conta.papel };
  }

  async sair(token: string): Promise<void> {
    await this.banco.cliente.sessao.deleteMany({ where: { id: resumirToken(token) } });
  }
}
