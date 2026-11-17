// Ponto de entrada da API. Toda a configuração fica em app.module.ts e aplicacao.ts, que os testes também usam.
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { configurarAplicacao } from './aplicacao';
import { AppModule } from './app.module';
import { VARIAVEIS_DE_AMBIENTE, type VariaveisDeAmbiente } from './configuracao/variaveis-de-ambiente';
import { MetricasService } from './metricas/metricas.service';
import { criarServidorDeMetricas } from './metricas/servidor-de-metricas';

async function iniciar(): Promise<void> {
  const aplicacao = await NestFactory.create(AppModule, { bufferLogs: true });
  aplicacao.useLogger(aplicacao.get(Logger));
  const variaveis = aplicacao.get<VariaveisDeAmbiente>(VARIAVEIS_DE_AMBIENTE);
  configurarAplicacao(aplicacao, variaveis);
  await aplicacao.listen(variaveis.porta);
  const servidorDeMetricas = criarServidorDeMetricas(aplicacao.get(MetricasService));
  servidorDeMetricas.listen(variaveis.portaDasMetricas);
  aplicacao.get(Logger).log(`API na porta ${variaveis.porta}; métricas internas na porta ${variaveis.portaDasMetricas}.`);
}

void iniciar();
