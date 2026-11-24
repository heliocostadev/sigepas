import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { criarAplicacaoDeTeste } from './teste/criar-aplicacao-de-teste';

describe('proteções básicas da API', () => {
  let aplicacao: INestApplication | undefined;
  afterEach(async () => aplicacao?.close());

  it('envia os cabeçalhos de segurança do helmet e esconde o nome do servidor', async () => {
    aplicacao = await criarAplicacaoDeTeste({ bancoDisponivel: true });
    const resposta = await request(aplicacao.getHttpServer()).get('/saude').expect(200);
    expect(resposta.headers['x-content-type-options']).toBe('nosniff');
    expect(resposta.headers['x-powered-by']).toBeUndefined();
  });

  it('libera o CORS só para as origens permitidas', async () => {
    aplicacao = await criarAplicacaoDeTeste({ bancoDisponivel: true });
    const servidor = aplicacao.getHttpServer();
    const permitida = await request(servidor).get('/saude').set('Origin', 'http://localhost:5173');
    expect(permitida.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const estranha = await request(servidor).get('/saude').set('Origin', 'https://site-estranho.example');
    expect(estranha.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('fecha o CORS para todas as origens quando a lista está vazia', async () => {
    aplicacao = await criarAplicacaoDeTeste({ bancoDisponivel: true, variaveis: { origensPermitidas: [] } });
    const resposta = await request(aplicacao.getHttpServer()).get('/saude').set('Origin', 'http://localhost:5173');
    expect(resposta.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('responde 429 quando o limite de requisições por minuto é ultrapassado', async () => {
    aplicacao = await criarAplicacaoDeTeste({ bancoDisponivel: true, variaveis: { limiteDeRequisicoesPorMinuto: 2 } });
    const servidor = aplicacao.getHttpServer();
    await request(servidor).get('/saude').expect(200);
    await request(servidor).get('/saude').expect(200);
    await request(servidor).get('/saude').expect(429);
  });

  it('atrás do Nginx, conta o limite por cliente, pelo endereço que o proxy informa', async () => {
    aplicacao = await criarAplicacaoDeTeste({ bancoDisponivel: true, variaveis: { limiteDeRequisicoesPorMinuto: 1 } });
    const servidor = aplicacao.getHttpServer();
    await request(servidor).get('/saude').set('X-Forwarded-For', '203.0.113.10').expect(200);
    await request(servidor).get('/saude').set('X-Forwarded-For', '203.0.113.20').expect(200);
    await request(servidor).get('/saude').set('X-Forwarded-For', '203.0.113.10').expect(429);
  });

  it('sem o cabeçalho do proxy, conta o limite pelo endereço da conexão', async () => {
    aplicacao = await criarAplicacaoDeTeste({ bancoDisponivel: true, variaveis: { limiteDeRequisicoesPorMinuto: 1 } });
    const servidor = aplicacao.getHttpServer();
    await request(servidor).get('/saude').expect(200);
    await request(servidor).get('/saude').set('X-Forwarded-For', '203.0.113.30').expect(200);
    await request(servidor).get('/saude').expect(429);
  });

  it('confia só no último salto: um endereço inventado pelo cliente no começo da lista não muda a contagem', async () => {
    aplicacao = await criarAplicacaoDeTeste({ bancoDisponivel: true, variaveis: { limiteDeRequisicoesPorMinuto: 1 } });
    const servidor = aplicacao.getHttpServer();
    await request(servidor).get('/saude').set('X-Forwarded-For', '198.51.100.1, 203.0.113.10').expect(200);
    await request(servidor).get('/saude').set('X-Forwarded-For', '198.51.100.2, 203.0.113.10').expect(429);
  });
});
