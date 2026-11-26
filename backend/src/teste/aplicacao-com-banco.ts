// Aplicação inteira contra o PostgreSQL de teste (DATABASE_URL_DE_TESTE), com uma conta de gestor e uma de operador.
// Cada arquivo de teste começa com o banco limpo. Os testes rodam um arquivo por vez (fileParallelism desligado no
// vitest.config.mts), porque todos usam o mesmo banco.
import type { INestApplication } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { gerarHashDaSenha } from '../autenticacao/senha';
import { BancoDeDadosService } from '../banco-de-dados/banco-de-dados.service';
import { criarAplicacaoDeTeste } from './criar-aplicacao-de-teste';

export const ENDERECO_DO_BANCO_DE_TESTE = process.env['DATABASE_URL_DE_TESTE'];
export const SENHA_DE_TESTE = 'senha-ficticia-de-teste-123';
export const EMAIL_DO_GESTOR = 'gestor@teste.sigepas';
export const EMAIL_DO_OPERADOR = 'operador@teste.sigepas';

let hashDaSenhaDeTeste: string | undefined;

export function csvFicticioDeTeste(): string {
  return readFileSync(join(__dirname, 'olostech-ficticio-de-teste.csv'), 'utf8');
}

export async function limparBanco(banco: BancoDeDadosService): Promise<void> {
  await banco.cliente.$executeRawUnsafe(
    'TRUNCATE contas, sessoes, pedidos, cancelamentos_na_fila, viagens, passageiros, veiculos, motoristas, ' +
      'locais_de_embarque, dias_nao_uteis, escala_do_dia, frota_do_dia, padronizacoes_de_locais, importacoes RESTART IDENTITY CASCADE',
  );
}

export interface AplicacaoComBanco {
  aplicacao: INestApplication;
  banco: BancoDeDadosService;
  gestor: string;
  operador: string;
  chamar: (rota: string, argumentos?: unknown[], cookie?: string) => request.Test;
}

export async function entrar(aplicacao: INestApplication, email: string): Promise<string> {
  const resposta = await request(aplicacao.getHttpServer())
    .post('/autenticacao/entrar')
    .send({ email, senha: SENHA_DE_TESTE })
    .expect(200);
  const cookies = resposta.headers['set-cookie'] as unknown as string[];
  return (cookies[0] ?? '').split(';')[0] ?? '';
}

export async function criarAplicacaoComBanco(opcoes: { semearDadosFicticios?: boolean } = {}): Promise<AplicacaoComBanco> {
  const aplicacao = await criarAplicacaoDeTeste({
    variaveis: {
      enderecoDoBanco: ENDERECO_DO_BANCO_DE_TESTE ?? '',
      limiteDeRequisicoesPorMinuto: 10_000,
      semearDadosFicticios: !!opcoes.semearDadosFicticios,
    },
  });
  const banco = aplicacao.get(BancoDeDadosService);
  await limparBanco(banco);
  hashDaSenhaDeTeste ??= await gerarHashDaSenha(SENHA_DE_TESTE);
  await banco.cliente.conta.createMany({
    data: [
      { email: EMAIL_DO_GESTOR, nome: 'Gestora de Teste', papel: 'GESTOR', hashDaSenha: hashDaSenhaDeTeste },
      { email: EMAIL_DO_OPERADOR, nome: 'Operador de Teste', papel: 'OPERADOR', hashDaSenha: hashDaSenhaDeTeste },
    ],
  });
  const gestor = await entrar(aplicacao, EMAIL_DO_GESTOR);
  const operador = await entrar(aplicacao, EMAIL_DO_OPERADOR);
  const chamar = (rota: string, argumentos: unknown[] = [], cookie = operador) =>
    request(aplicacao.getHttpServer()).post(rota).set('Cookie', cookie).send({ argumentos });
  return { aplicacao, banco, gestor, operador, chamar };
}
