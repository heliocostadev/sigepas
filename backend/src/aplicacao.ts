import type { INestApplication } from '@nestjs/common';
import type { Express } from 'express';
import helmet from 'helmet';
import type { VariaveisDeAmbiente } from './configuracao/variaveis-de-ambiente';
import { guardarTelaDeOrigem } from './tempo-real/tela-de-origem';

// Quantos proxies ficam entre o cliente e a API. Em produção, só o Nginx. Com 1, a API usa o último endereço do
// cabeçalho X-Forwarded-For, que é o que o Nginx escreveu. Endereços que o cliente inventa no começo da lista são
// ignorados. Com "true", o cliente conseguiria escolher o próprio endereço e fugir do limite de requisições.
const PROXIES_CONFIAVEIS = 1;

// Proteções que valem para toda a API. Ficam numa função só, para o main.ts e os testes usarem a mesma configuração.
export function configurarAplicacao(aplicacao: INestApplication, variaveis: VariaveisDeAmbiente): void {
  (aplicacao.getHttpAdapter().getInstance() as Express).set('trust proxy', PROXIES_CONFIAVEIS);
  aplicacao.use(helmet());
  aplicacao.use(guardarTelaDeOrigem);
  // CORS fechado: só as origens listadas em ORIGENS_PERMITIDAS podem chamar a API pelo navegador.
  aplicacao.enableCors({ origin: variaveis.origensPermitidas.length > 0 ? variaveis.origensPermitidas : false });
  aplicacao.enableShutdownHooks();
}
