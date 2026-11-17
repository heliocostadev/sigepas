# 0013. Estrutura do repositório e versões do esqueleto

- **Situação:** proposta em 16/11/2026. Aguarda a aprovação do Hélio.
- **Redação:** IA, em 16/11/2026, durante a montagem do esqueleto.
- **Fontes:** plano de construção de 08/11/2026 (seção 1) e ADRs 0002 a 0006. Também a consulta ao npm e os testes
  na máquina do Hélio, ambos em 16/11/2026.

## Contexto

O esqueleto junta o back-end, o front-end, o banco e a observabilidade num repositório só. O núcleo de domínio já
existe em `src/dominio/`, e os PRs 1 a 3 ainda alteram essa pasta. Várias bibliotecas tinham versão nova ou
substituta na data da montagem.

## Decisão

- **Estrutura:** um repositório com workspaces do npm. O back-end fica em `backend/` e o front-end em `frontend/`, com
  um `package-lock.json` só, na raiz. O `src/dominio/` continua na raiz até o merge dos PRs 1 a 3, para não criar
  conflito com eles.
- **Node 24** ("Krypton"), versão de suporte longo (LTS) e a mesma da máquina do Hélio. A LTS mais nova é a 26
  ("Lithium"). A 24 continua com suporte e foi a versão testada no esqueleto.
- **TypeScript 5.9.3.** O `typescript-eslint` aceita só versões menores que 6.1, então a 7.0 está fora. O lint também
  aceita a 6.0.3. A 5.9.3 foi mantida porque é a linha usada desde o início do projeto. A troca para a 6.0 fica
  para uma ADR futura.
- **Prisma 7.10.1**, a última versão estável. A versão marcada como "latest" no npm era a 8.0.0-rc.34, que ainda é
  versão de teste. O Prisma 7 conversa com o PostgreSQL pelo adaptador `@prisma/adapter-pg`, e o cliente gerado fica
  em `backend/src/gerado/`, fora do git.
- **Métricas com `@prometheus-io/client`**, o cliente oficial do Prometheus. O `prom-client` foi marcado como
  substituído por ele.
- **Logs em JSON com `nestjs-pino`, por lista de permitidos.** Cada linha grava só o identificador, o método, o
  caminho sem a query string e o código de resposta. Nenhum cabeçalho e nenhum endereço IP entram no log
  (`backend/src/registro/formatadores-de-log.ts`). O log de acesso do Nginx também sai sem a query string e sem o
  IP. O log de erro do Nginx não aceita formato próprio, então ele registra só os erros críticos.
- **Proteções da API desde o esqueleto:** `helmet`, CORS fechado por lista de origens e limite de requisições por
  minuto (`@nestjs/throttler`).
- **A API confia em um salto de proxy** (`trust proxy` igual a 1). O Nginx envia só o IP real do cliente. Assim, para
  quem chega pelo Nginx, o limite de requisições conta cada cliente separado, e o cliente não consegue inventar o
  próprio endereço. Essa garantia depende de a porta 3000 da API ficar só na rede interna. Na máquina de
  desenvolvimento, ela é publicada em 127.0.0.1. Na produção, ela não é publicada.
- **Versões exatas** nos `package.json` do back-end e do front-end, sem `^`. Assim a máquina do Hélio, o CI e a
  imagem Docker usam as mesmas versões.
- **Portas do Docker Compose ligadas a `127.0.0.1`.** Só a própria máquina acessa o banco, a API e os painéis.
- **Métricas numa porta interna própria (9464).** A porta pública da API (3000) não tem a rota `/metrics`. O Nginx
  só repassa a porta pública e ainda devolve 404 para qualquer variação de `/api/metrics`. Na máquina de
  desenvolvimento, a porta 9464 também é publicada em 127.0.0.1, para conferência. Na produção, ela não é publicada.
- **Imagens Docker sem permissão de administrador:** a API roda como o usuário `node`, e as telas usam a imagem
  `nginx-unprivileged`. A imagem da API leva só as dependências de produção
  (`--omit=dev --omit=optional`). O
  `.dockerignore` deixa de fora `node_modules`, `.env`, `.git` e as pastas de cobertura.

## Alternativas consideradas

- **Mover o `src/dominio/` para `backend/` já no esqueleto:** deixa a estrutura final pronta. Mas cria conflito com
  os PRs 1 a 3, que pertencem à conversa da NP2.
- **TypeScript 7:** é mais rápido, mas quebra o lint.
- **Prisma 8 (versão de teste):** pode mudar antes da versão estável, e o prazo não comporta essa mudança.
- **`prom-client`:** funciona, mas está marcado como substituído.
- **`/metrics` na porta pública, com bloqueio só no Nginx:** foi a primeira versão. A conferência mostrou que
  `/api/metrics/` e `/api/METRICS` passavam pelo bloqueio, porque o Express aceita maiúsculas e barra no fim.

## Consequências

- O `npm run verificar` da raiz roda o domínio, o back-end e o front-end.
- O teste com banco real roda no CI e, na máquina do Hélio, com `docker compose up -d banco`.
- Depois do merge dos PRs 1 a 3, uma ADR nova decide se o domínio vai para dentro do `backend/`.
