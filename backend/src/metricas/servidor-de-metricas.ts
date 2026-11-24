import { createServer, type Server } from 'node:http';
import type { MetricasService } from './metricas.service';

// As métricas ficam num servidor separado, na PORTA_DAS_METRICAS, e não na porta pública da API. O Nginx só repassa
// a porta pública. Assim, nenhuma variação de endereço vinda da internet chega às métricas. Na produção, só o
// Prometheus, na rede interna do Docker Compose, consegue lê-las. Na máquina de desenvolvimento, a porta também é
// publicada em 127.0.0.1, para conferência.
export function criarServidorDeMetricas(metricas: MetricasService): Server {
  return createServer((requisicao, resposta) => {
    if (requisicao.method !== 'GET' || requisicao.url !== '/metrics') {
      resposta.writeHead(404).end();
      return;
    }
    metricas
      .gerarTexto()
      .then((texto) => resposta.writeHead(200, { 'Content-Type': metricas.tipoDeConteudo }).end(texto))
      .catch(() => resposta.writeHead(500).end());
  });
}
