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

5. Para entrar nas telas, crie uma conta com o comando `criar-conta` dentro do contêiner da API. O Compose local não
   cria o gestor inicial. Sem `SENHA_DA_CONTA`, o comando gera uma senha forte e a mostra uma vez só:

   ```bash
   docker compose exec api node backend/dist/comandos/criar-conta.js --email gestor@exemplo.org --nome "Gestor local" --papel gestor
   ```

6. Para rodar também o teste com banco real, suba só o banco e informe o endereço dele:

   ```bash
   docker compose up -d banco
   ```

   ```powershell
   $env:DATABASE_URL_DE_TESTE = 'postgresql://sigepas@localhost:5432/sigepas'; npm run test --workspace backend
   ```

A senha do Grafana vale só na máquina local, com dados fictícios. O banco local aceita conexão sem senha, porque só a
própria máquina o alcança.

Se o banco local foi criado antes de 24/11/2026, ele ainda pede a senha antiga. Para recriar o banco, apague o volume
com os dados fictícios e suba de novo:

```bash
docker compose down -v
```

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
| `SEMEAR_DADOS_FICTICIOS` | Não | desligado | Com `sim`, a API cadastra motoristas, carros, locais de embarque e padronizações fictícios quando os cadastros de carros e de motoristas estão vazios |
| `EMAIL_DO_GESTOR_INICIAL` | Não | nenhum | E-mail do gestor que a API cria na subida, se a conta ainda não existir. Anda junto com `HASH_DA_SENHA_DO_GESTOR_INICIAL` |
| `HASH_DA_SENHA_DO_GESTOR_INICIAL` | Não | nenhum | Hash scrypt da senha desse gestor, começando por `scrypt$`. O comando `criar-conta` com `--so-hash` gera o hash |
| `NOME_DO_GESTOR_INICIAL` | Não | `Gestor` | Nome desse gestor |

Em produção, os valores ficam em variáveis guardadas fora do repositório, na máquina da AWS. Nenhum arquivo `.env`
entra no git.

## Estrutura de pastas

| Pasta | O que tem |
|---|---|
| `src/dominio/` | Primeira versão das regras da importação, em TypeScript puro, mantida só com os testes. O sistema no ar não usa esta pasta |
| `backend/` | API em NestJS, com Prisma, testes e `Dockerfile`. As regras de negócio que rodam no sistema ficam em `backend/src/regras/regras-do-setor.ts` |
| `frontend/` | Telas, com Vite, testes, `Dockerfile` e configuração do Nginx. Só a tela de entrada é React (`frontend/src/PaginaInicial.tsx`). As telas dos três fluxos são JavaScript trazido do SIGEPAS em Apps Script ([ADR 0016](../adr/0016-porte-das-telas-e-tempo-real.md)), em `frontend/src/sistema/` e `frontend/sistema/index.html` |
| `infraestrutura/` | Terraform da AWS e Compose de produção (detalhes em [`docs/deploy/`](../deploy/README.md)) |
| `observabilidade/` | Configuração do Prometheus e do Grafana |
| `docker-compose.yml` | Banco, migração do banco, API, telas, Prometheus e Grafana |
