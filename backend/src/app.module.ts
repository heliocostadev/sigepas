import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { ConfiguracaoModule } from './configuracao/configuracao.module';
import { VARIAVEIS_DE_AMBIENTE, type VariaveisDeAmbiente } from './configuracao/variaveis-de-ambiente';
import { MetricasModule } from './metricas/metricas.module';
import { deveFicarForaDoLog, formatarRequisicaoParaLog, formatarRespostaParaLog } from './registro/formatadores-de-log';
import { SaudeModule } from './saude/saude.module';
import { AutenticacaoModule } from './autenticacao/autenticacao.module';
import { GuardaDeSessao } from './autenticacao/guarda-de-sessao.guard';
import { FluxosModule } from './fluxos.module';
import { TempoRealModule } from './tempo-real/tempo-real.module';

const UM_MINUTO_EM_MILISSEGUNDOS = 60_000;

@Module({
  imports: [
    ConfiguracaoModule,
    // Logs em JSON. Os formatadores gravam só o que está na lista de permitidos (registro/formatadores-de-log.ts).
    LoggerModule.forRootAsync({
      inject: [VARIAVEIS_DE_AMBIENTE],
      useFactory: (variaveis: VariaveisDeAmbiente) => ({
        pinoHttp: {
          level: variaveis.nivelDeLog,
          serializers: { req: formatarRequisicaoParaLog, res: formatarRespostaParaLog },
          autoLogging: { ignore: (requisicao) => deveFicarForaDoLog(requisicao.url) },
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [VARIAVEIS_DE_AMBIENTE],
      useFactory: (variaveis: VariaveisDeAmbiente) => [
        { ttl: UM_MINUTO_EM_MILISSEGUNDOS, limit: variaveis.limiteDeRequisicoesPorMinuto },
      ],
    }),
    SaudeModule,
    MetricasModule,
    AutenticacaoModule,
    TempoRealModule,
    FluxosModule,
  ],
  // Primeiro o limite de requisições, depois a sessão: quem passa do limite nem chega a consultar o banco.
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: GuardaDeSessao },
  ],
})
export class AppModule {}
