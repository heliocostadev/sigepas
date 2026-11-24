import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { criarAplicacaoDeTeste } from '../teste/criar-aplicacao-de-teste';
import { MetricasService } from './metricas.service';
import { criarServidorDeMetricas } from './servidor-de-metricas';

describe('métricas para o Prometheus', () => {
  let aplicacao: INestApplication | undefined;
  let servidorDeMetricas: Server | undefined;
  afterEach(async () => {
    servidorDeMetricas?.close();
    await aplicacao?.close();
  });

  async function prepararAmbiente(bancoDisponivel: boolean) {
    aplicacao = await criarAplicacaoDeTeste({ bancoDisponivel });
    servidorDeMetricas = criarServidorDeMetricas(aplicacao.get(MetricasService));
    return { api: aplicacao.getHttpServer(), metricas: servidorDeMetricas };
  }

  it('a porta pública da API não entrega as métricas, em nenhuma variação do endereço', async () => {
    const { api } = await prepararAmbiente(true);
    for (const endereco of ['/metrics', '/metrics/', '/METRICS', '/Metrics/']) {
      await request(api).get(endereco).expect(404);
    }
  });

  it('o servidor interno de métricas entrega o formato do Prometheus, com as métricas do processo', async () => {
    const { metricas } = await prepararAmbiente(true);
    const resposta = await request(metricas).get('/metrics').expect(200);
    expect(resposta.headers['content-type']).toContain('text/plain');
    expect(resposta.text).toContain('process_cpu_user_seconds_total');
  });

  it('o servidor interno de métricas só aceita GET', async () => {
    const { metricas } = await prepararAmbiente(true);
    await request(metricas).post('/metrics').expect(404);
  });

  it('o servidor interno de métricas responde 500, sem detalhe, quando a coleta falha', async () => {
    const servicoQueFalha = { tipoDeConteudo: 'text/plain', gerarTexto: async () => { throw new Error('falha simulada'); } };
    servidorDeMetricas = criarServidorDeMetricas(servicoQueFalha as unknown as MetricasService);
    const resposta = await request(servidorDeMetricas).get('/metrics').expect(500);
    expect(resposta.text).toBe('');
  });

  it('o servidor interno de métricas responde 404 em qualquer outro endereço', async () => {
    const { metricas } = await prepararAmbiente(true);
    await request(metricas).get('/saude').expect(404);
  });

  it('conta cada requisição da API pela rota e pelo código de resposta', async () => {
    const { api, metricas } = await prepararAmbiente(false);
    await request(api).get('/saude').expect(503);
    const resposta = await request(metricas).get('/metrics').expect(200);
    expect(resposta.text).toMatch(/sigepas_requisicoes_http_total\{metodo="GET",rota="\/saude",status="503"\} 1/);
  });

  it('agrupa as rotas que não existem numa etiqueta só, para não criar uma série por endereço digitado', async () => {
    const { api, metricas } = await prepararAmbiente(true);
    await request(api).get('/rota-que-nao-existe-123').expect(404);
    const resposta = await request(metricas).get('/metrics').expect(200);
    expect(resposta.text).toContain('rota="nao-encontrada",status="404"');
    expect(resposta.text).not.toContain('rota-que-nao-existe-123');
  });
});
