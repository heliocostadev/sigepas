# Qualidade: portões do CI, análise estática e observabilidade

## Portões do CI

| Workflow | Etapa | Falha quando |
|---|---|---|
| `ci.yml` | Tipos, lint e testes com cobertura | Erro de tipo, regra do ESLint, teste falhando ou cobertura abaixo do piso |
| `ci.yml` | Padrão das mensagens de commit (só em PR) | Commit fora de `tipo(escopo): descrição` (`scripts/conferir-mensagens-de-commit.mjs`) |
| `ci.yml` | SonarCloud (desligado até a conta existir) | Portão de qualidade do SonarCloud reprovado |
| `ci.yml` | **CI aprovado** | Qualquer etapa acima falhou. Esta etapa junta o `ci.yml` numa verificação só para a proteção da `main` e da `dev`. A ideia é do Cauê Fernandes, repositório [alagou](https://github.com/CaueFer/alagou). As verificações de segurança, abaixo, são marcadas à parte |
| `seguranca.yml` | gitleaks | Segredo no histórico |
| `seguranca.yml` | Revisão de dependências (só em PR) | Dependência nova com falha conhecida moderada ou maior, ou licença GPL ou AGPL |
| `seguranca.yml` | npm audit | Falha conhecida moderada ou maior em dependência de produção |
| `codeql.yml` | CodeQL | Falha de segurança no código TypeScript |

O Dependabot (`.github/dependabot.yml`) abre PR semanal para a `dev` com atualizações do npm e das GitHub Actions.

## Para ligar o que ainda está desligado

- **SonarCloud:** entre no SonarCloud com a conta do GitHub. Importe `heliocostadev/sigepas`. Confira a chave do
  projeto e a organização em `sonar-project.properties`. Crie no repositório o segredo `SONAR_TOKEN` e a variável
  `SONAR_HABILITADO=true`.
- **Wiki:** crie a primeira página pelo site. Crie também a variável `WIKI_HABILITADA=true`.
- **Proteção das branches:** na `main` e na `dev`, marque como obrigatória a verificação "CI aprovado". Marque também
  as verificações de segurança, que ficam em workflows separados: "segredos no histórico (gitleaks)" e "análise de
  segurança do código" (CodeQL).
- **Rótulos:** crie no repositório os rótulos `defeito` e `melhoria`, usados pelos modelos de issue.

## Observabilidade (entra com o esqueleto)

- Logs estruturados em JSON, sem dado pessoal (nome, telefone e matrícula mascarados).
- Endpoint `/metrics` no formato do Prometheus, `/saude` para o monitor de disponibilidade.
- Prometheus e Grafana no Docker Compose, com um painel dos três fluxos (importações, carros montados, erros).
- Monitor externo de disponibilidade com alerta, para saber antes do professor que o sistema caiu.
