import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { ContarRequisicoesMiddleware } from './contar-requisicoes.middleware';
import { MetricasService } from './metricas.service';

// O módulo conta as requisições da API. A entrega das métricas fica no servidor interno (servidor-de-metricas.ts),
// fora das rotas públicas.
@Module({ providers: [MetricasService], exports: [MetricasService] })
export class MetricasModule implements NestModule {
  configure(consumidor: MiddlewareConsumer): void {
    consumidor.apply(ContarRequisicoesMiddleware).forRoutes('*');
  }
}
