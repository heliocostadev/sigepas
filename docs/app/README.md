# Rodar o projeto na máquina

## O que instalar antes

- Node 24 ou superior.
- Docker Desktop, com o WSL 2 no Windows.

## Passos

1. Instale as dependências na raiz do repositório:

   ```bash
   npm install
   ```

2. Rode os portões, que são os mesmos do CI:

   ```bash
   npm run verificar
   ```

3. Suba o ambiente completo:

   ```bash
   docker compose up -d --build
   ```

4. Abra os endereços:

   | O quê | Endereço |
   |---|---|
   | Telas | http://localhost:8080 |
   | API, saúde | http://localhost:3000/saude |
   | Métricas da API (porta interna) | http://localhost:9464/metrics |
   | Prometheus | http://localhost:9090 |
   | Grafana | http://localhost:3001 (usuário `admin`, senha local `grafana_local`) |

5. Para rodar também o teste com banco real, suba só o banco e informe o endereço dele:

   ```bash
   docker compose up -d banco
   ```

   ```powershell
   $env:DATABASE_URL_DE_TESTE = 'postgresql://sigepas:sigepas_local@localhost:5432/sigepas'; npm run test --workspace backend
   ```

As senhas acima valem só na máquina local, com dados fictícios.

## Variáveis de ambiente da API

A API lê as variáveis uma vez, ao iniciar, em `backend/src/configuracao/variaveis-de-ambiente.ts`. Se faltar uma
variável obrigatória, a API não sobe e a mensagem diz qual variável corrigir.

| Variável | Obrigatória | Padrão | Para quê |
|---|---|---|---|
| `DATABASE_URL` | Sim | | Endereço do PostgreSQL |
| `PORTA` | Não | `3000` | Porta da API |
| `ORIGENS_PERMITIDAS` | Não | nenhuma | Endereços das telas que podem chamar a API, separados por vírgula |
| `PORTA_DAS_METRICAS` | Não | `9464` | Porta interna das métricas. Deve ser diferente de `PORTA` |
| `LIMITE_DE_REQUISICOES_POR_MINUTO` | Não | `100` | Limite por cliente, pelo IP que o Nginx informa |
| `NIVEL_DE_LOG` | Não | `info` | Nível do log: `fatal`, `error`, `warn`, `info`, `debug`, `trace` ou `silent` |

Em produção, os valores ficam em variáveis guardadas fora do repositório, na máquina da AWS. Nenhum arquivo `.env`
entra no git.

## Estrutura de pastas

| Pasta | O que tem |
|---|---|
| `src/dominio/` | Núcleo de domínio: regras de negócio em TypeScript puro |
| `backend/` | API em NestJS, com Prisma, testes e `Dockerfile` |
| `frontend/` | Telas em React com Vite, com testes, `Dockerfile` e configuração do Nginx |
| `observabilidade/` | Configuração do Prometheus e do Grafana |
| `docker-compose.yml` | Banco, API, telas, Prometheus e Grafana |
