import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { criarAplicacaoDeTeste } from '../teste/criar-aplicacao-de-teste';

describe('GET /saude', () => {
  let aplicacao: INestApplication | undefined;
  afterEach(async () => aplicacao?.close());

  it('responde 200 quando o banco está disponível', async () => {
    aplicacao = await criarAplicacaoDeTeste({ bancoDisponivel: true });
    await request(aplicacao.getHttpServer()).get('/saude').expect(200, { situacao: 'ok', banco: 'disponivel' });
  });

  it('responde 503 quando o banco está indisponível, para o monitor de disponibilidade avisar', async () => {
    aplicacao = await criarAplicacaoDeTeste({ bancoDisponivel: false });
    const resposta = await request(aplicacao.getHttpServer()).get('/saude').expect(503);
    expect(resposta.body).toEqual({ situacao: 'degradado', banco: 'indisponivel' });
  });
});
