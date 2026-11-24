# Qualidade: portões do CI, análise estática e observabilidade

## Portões do CI

| Workflow | Etapa | Falha quando |
|---|---|---|
| `ci.yml` | Tipos, lint e testes com cobertura | Erro de tipo, regra do ESLint, teste falhando ou cobertura abaixo do piso |
| `ci.yml` | Padrão das mensagens de commit (só em PR) | Commit fora de `tipo(escopo): descrição` (`scripts/conferir-mensagens-de-commit.mjs`) |
| `ci.yml` | SonarQube Cloud, novo nome do SonarCloud (ligado em 23/11/2026, plano gratuito) | Portão de qualidade "Sonar way" reprovado |
| `ci.yml` | **CI aprovado** | Qualquer etapa acima falhou. Esta etapa junta o `ci.yml` numa verificação só para a proteção da `main` e da `dev`. A ideia é do Cauê Fernandes, repositório [alagou](https://github.com/CaueFer/alagou). As verificações de segurança, abaixo, são marcadas à parte |
| `seguranca.yml` | gitleaks | Segredo no histórico |
| `seguranca.yml` | Revisão de dependências (só em PR) | Dependência nova com falha conhecida moderada ou maior, ou licença GPL ou AGPL |
| `seguranca.yml` | npm audit | Falha conhecida moderada ou maior em dependência de produção |
| `codeql.yml` | CodeQL | Falha de segurança no código TypeScript |

O Dependabot (`.github/dependabot.yml`) abre PR semanal para a `dev` com atualizações do npm e das GitHub Actions.

Toda instalação de dependências usa `npm ci --ignore-scripts`, no CI e nos `Dockerfile`. Assim, nenhum pacote roda
script próprio durante a instalação (regra S6505 do SonarQube Cloud). O Prisma e o SWC funcionam sem esses scripts.

## Proteção das branches

- **`dev`, desde 23/11/2026:** o merge exige a verificação "CI aprovado", e a regra vale também para o
  administrador. Push forçado e exclusão da branch estão bloqueados. A branch não precisa estar atualizada com a `dev`
  para o merge.

## SonarQube Cloud

A chave do projeto é `heliocostadev_sigepas`, e a da organização é `heliocostadev`, as mesmas do
`sonar-project.properties`. O segredo `SONAR_TOKEN` e a variável `SONAR_HABILITADO=true` ficam no repositório. A
análise automática do SonarQube Cloud fica desligada, porque a análise é feita pelo CI, junto com a cobertura.

O plano gratuito só analisa a `main` e os PRs. Por isso, o job roda em todo PR e no push para a `main`, e não roda no
push para a `dev`. Toda mudança chega à `dev` por PR, e a proteção da `dev` exige o CI verde no PR. Assim, todo código
da `dev` passou pelo portão de qualidade antes do merge. O painel do SonarQube Cloud mostra a `main`, que só muda no
release.

## Para ligar o que ainda está desligado

- **Wiki:** crie a primeira página pelo site. Crie também a variável `WIKI_HABILITADA=true`.
- **Proteção da `main`:** marque como obrigatória a verificação "CI aprovado". Na `main` e na `dev`, avalie marcar
  também as verificações de segurança, que ficam em workflows separados: "segredos no histórico (gitleaks)" e
  "análise de segurança do código" (CodeQL).
- **Rótulos:** crie no repositório os rótulos `defeito` e `melhoria`, usados pelos modelos de issue.

## Observabilidade

- A API grava logs estruturados em JSON (`nestjs-pino`). Cada linha traz só o identificador, o método, o caminho sem
  a query string e o código de resposta. Nome, telefone, matrícula, cabeçalhos e endereço IP não entram no log (LGPD).
  A regra fica em `backend/src/registro/formatadores-de-log.ts`, com testes.
- A API publica as métricas no formato do Prometheus numa porta interna (9464), que não sai para a internet. A rota
  `/saude` serve ao monitor de disponibilidade e responde 503 quando o banco não responde.
- O contador `sigepas_requisicoes_http_total` registra cada requisição por método, rota e código de resposta.
- O Prometheus e o Grafana sobem no Docker Compose. O Grafana já vem ligado ao Prometheus.
- Falta o painel do Grafana com os três fluxos (importações, carros montados, erros), que entra com o fluxo 1.
- Falta o monitor externo de disponibilidade com alerta, que entra com o deploy.
- O log de erro do Nginx registra só os erros críticos, para não gravar IP e query string. Por isso, uma falha de
  conexão com a API aparece só como código 502 no log de acesso. Para investigar um 502, confira primeiro o
  `docker compose logs api` e a rota `/saude`.
- O log de acesso do Nginx grava o caminho depois da regravação interna (`$uri`). Um endereço que não existe nas
  telas aparece como `/index.html`.
