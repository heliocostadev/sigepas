import { Injectable } from '@nestjs/common';
import { Counter, Registry, collectDefaultMetrics } from '@prometheus-io/client';

// Guarda as métricas que o Prometheus lê em /metrics: as do processo Node e a contagem de requisições HTTP.
// Cada aplicação tem o próprio registro, para os testes não somarem contagens entre si.
@Injectable()
export class MetricasService {
  private readonly registro = new Registry();
  private readonly requisicoesHttp = new Counter({
    name: 'sigepas_requisicoes_http_total',
    help: 'Requisições HTTP atendidas pela API, por método, rota e código de resposta.',
    labelNames: ['metodo', 'rota', 'status'] as const,
    registers: [this.registro],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registro });
  }

  registrarRequisicao(metodo: string, rota: string, status: number): void {
    this.requisicoesHttp.inc({ metodo, rota, status: String(status) });
  }

  get tipoDeConteudo(): string {
    return this.registro.contentType;
  }

  async gerarTexto(): Promise<string> {
    return this.registro.metrics();
  }
}
