import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { MetricasService } from './metricas.service';

// Registra cada requisição quando a resposta termina. A etiqueta usa o molde da rota ("/saude"), e não o endereço
// digitado: assim, endereços inventados não criam uma série nova no Prometheus a cada acesso.
// Quando nenhuma rota atende, o Express 5 deixa no lugar o molde curinga deste middleware ("{/*splat}"). Esse caso,
// e o de molde ausente, viram a etiqueta "nao-encontrada".
function etiquetaDaRota(moldeDaRota: unknown): string {
  if (typeof moldeDaRota !== 'string' || moldeDaRota.includes('*')) return 'nao-encontrada';
  return moldeDaRota;
}

@Injectable()
export class ContarRequisicoesMiddleware implements NestMiddleware {
  constructor(private readonly metricas: MetricasService) {}

  use(requisicao: Request, resposta: Response, proximo: NextFunction): void {
    resposta.on('finish', () => {
      const rota = etiquetaDaRota(requisicao.route?.path);
      this.metricas.registrarRequisicao(requisicao.method, rota, resposta.statusCode);
    });
    proximo();
  }
}
