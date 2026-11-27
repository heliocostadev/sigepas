# SIGEPAS

**Sistema de Gestão de Transportes de Pacientes e Servidores**

O SIGEPAS organiza o transporte de pacientes do setor de transportes da Secretaria de Saúde de Joinville. O setor
recebe do OLOSTECH a lista de pedidos de transporte para consultas, exames e tratamentos em outras cidades. O sistema
ajuda a transformar essa lista em carros: quem vai em qual veículo, com qual motorista e a que horas.

Existem dois sistemas com o mesmo nome, e um não substitui o outro:

- **SIGEPAS em Apps Script:** construído durante o estágio, numa planilha, e usado todos os dias no setor.
- **SIGEPAS em arquitetura de servidor:** este repositório, construído para fim acadêmico. As regras vêm da versão 18
  do SIGEPAS em Apps Script (decisão de 27/11/2026).

> **Contexto acadêmico:** trabalho de conclusão de curso e PAC Extensionista VIII, na linha Web Apps do Portfólio. O
> curso é Engenharia de Software, no Centro Universitário Católica SC (Joinville).
> Este repositório é público e **não contém nenhum dado de paciente**. O sistema no ar e os testes usam só dados
> fictícios.

## No ar

| O quê | Onde |
|---|---|
| Sistema | https://sigepas.duckdns.org (o acesso exige uma conta) |
| Versão publicada | [v1.0.0](https://github.com/heliocostadev/sigepas/releases/tag/v1.0.0), de 27/11/2026 |
| Documentação | [Wiki](https://github.com/heliocostadev/sigepas/wiki), gerada a partir da pasta [`docs/`](docs/README.md) |
| Análise estática | [SonarQube Cloud](https://sonarcloud.io/project/overview?id=heliocostadev_sigepas), projeto `heliocostadev_sigepas` |

## O problema

O setor recebe todo dia uma lista de pedidos de transporte e precisa transformá-la em carros. Para cada carro, o setor
define o veículo, o motorista, a hora de saída e o roteiro. Hoje isso depende de planilha, de digitação repetida e da
memória das pessoas. Os efeitos são concretos:

- A mesma cidade aparece escrita de cinco formas diferentes, e o roteiro se perde.
- Um pedido cancelado pela UBSF não chega a quem já montou o carro, e o motorista sai para buscar quem cancelou.
- A escala do dia não sobrevive a nenhuma mudança de última hora.

## O que está no ar

Os três fluxos da entrega foram decididos em 26/11/2026. Os detalhes estão em
[`docs/produto/README.md`](docs/produto/README.md).

| Fluxo | O que faz |
|---|---|
| **1. Do arquivo à fila** | Recebe o arquivo CSV do OLOSTECH, interpreta datas, status e locais, padroniza cidade e local pelo dicionário e monta a fila do dia |
| **2. Do pedido ao carro escalado** | Monta os carros respeitando a lotação, permite editar e estornar, define motoristas e carros, forma a escala e emite a guia |
| **3. Confirmação do paciente** | Registra a ligação para o paciente com a marcação de confirmado ou não confirmado, sem WhatsApp |

A remoção interna e os transportes dentro de Joinville ficaram fora desta entrega e são melhoria futura.

### Login e papéis

A entrada é por e-mail e senha, com a sessão guardada no servidor. Toda a logística (importação,
fila, carros, escala, confirmação e guias) fica com os dois papéis, operador e gestor. Só as alterações na tela
Configurações exigem o papel de gestor, pela marca `@SoGestor` na API. Na revisão de locais da importação, os dois
papéis gravam a decisão sobre um local pendente. As contas são criadas no servidor pelo comando `criar-conta`.

### Arquitetura

A API é em NestJS, com PostgreSQL e Prisma. A tela de entrada é em React com Vite. As cinco telas dos
fluxos e a tela Configurações vieram do SIGEPAS em Apps Script e são JavaScript sem React
([ADR 0016](docs/adr/0016-porte-das-telas-e-tempo-real.md)). As decisões estão em [`docs/adr/`](docs/adr/README.md),
e os diagramas C4 estão em [`docs/arquitetura/`](docs/arquitetura/README.md).

### Entrega contínua

O CI roda em todo PR: tipos, lint, testes com cobertura num PostgreSQL real, padrão das mensagens
de commit e SonarQube Cloud. A cobertura mínima é de 75% no back-end e de 25% no front-end. Workflows separados rodam
o gitleaks, a revisão de dependências, o npm audit e o CodeQL. A cada push na `main`, o workflow de deploy publica as
imagens no GitHub Container Registry. Depois, ele atualiza a máquina na AWS pelo Systems Manager, sem SSH.

### Hospedagem

O sistema roda numa máquina EC2 em `us-east-2`, criada com Terraform, em contêineres Docker. O Caddy
faz o HTTPS e repassa as requisições ao Nginx. O Nginx serve as telas e encaminha à API as chamadas de `/api`.

### Observabilidade

A API grava logs em JSON sem dado pessoal e publica métricas no formato do Prometheus. O
Prometheus e o Grafana rodam na própria máquina e só respondem em `127.0.0.1`. O Grafana já sobe ligado ao Prometheus.
O painel do SIGEPAS no Grafana ainda não foi criado.

## Onde fica cada parte

| Pasta | O que tem |
|---|---|
| [`backend/`](backend/) | API em NestJS. Regras do setor em `backend/src/regras/`, esquema e migrações do Prisma em `backend/prisma/`, comando `criar-conta` em `backend/src/comandos/` |
| [`frontend/`](frontend/) | Tela de entrada em React (`frontend/src/`) e telas dos fluxos (`frontend/src/sistema/`), com Vite, `Dockerfile` e configuração do Nginx |
| [`src/dominio/`](src/dominio/) | Núcleo de domínio anterior, em TypeScript puro e com testes. O sistema no ar não usa esta pasta. As regras que rodam ficam em `backend/src/regras/` |
| [`infraestrutura/`](infraestrutura/) | Terraform da AWS (`terraform/`) e Compose de produção, Caddyfile e script de atualização (`producao/`) |
| [`observabilidade/`](observabilidade/) | Configuração do Prometheus e da fonte de dados do Grafana |
| [`docs/`](docs/README.md) | Documentação por assunto, publicada na Wiki |
| [`specs/`](specs/README.md) | Spec do fluxo 1 e os modelos de spec, plano e tarefas |
| [`scripts/`](scripts/) | Scripts de apoio: conferência da escrita e das mensagens de commit, CSV fictício e montagem da Wiki |
| [`.github/`](.github/) | Workflows do CI, da segurança, do deploy e da Wiki, modelos de issue e de PR, Dependabot |

## Rodar na máquina

Requer Node 24 ou superior, a mesma versão do CI e das imagens Docker.

```bash
npm install
npm run verificar
```

`npm run verificar` roda tipos, lint e testes na raiz, no back-end e no front-end. Sem a variável
`DATABASE_URL_DE_TESTE`, os testes do back-end que precisam do PostgreSQL são pulados. Para subir o sistema completo
com Docker e rodar os testes com banco, siga [`docs/app/README.md`](docs/app/README.md).

| Comando | O que faz |
|---|---|
| `npm run verificar` | Tipos, lint e testes da raiz, do back-end e do front-end |
| `npm run test:cov:todos` | Cobertura da raiz, do back-end e do front-end |
| `npm test` | Testes do núcleo `src/dominio` |
| `npm run lint` | ESLint em `src`, `backend/src` e `frontend/src` |

## Como o repositório funciona

- **`main`:** o que está no ar. Só recebe mudança por PR.
- **`dev`:** integração. Todo PR de trabalho aponta para cá.
- **`feat/...`, `fix/...`, `docs/...`:** uma branch por assunto, curta.

Todo Pull Request roda tipos, lint e testes. O merge só acontece com a verificação "CI aprovado" verde. A proteção das
branches não exige revisão aprovada. Detalhes em [CONTRIBUTING.md](CONTRIBUTING.md).

## Documentação

O SIGEPAS em Apps Script foi documentado tela por tela. A documentação diz o que cada tela faz e traz as regras de
negócio numeradas. Ela também diz o que **não** deve ser reproduzido aqui e fica fora deste repositório. A pasta
[`docs/`](docs/README.md) descreve o sistema deste repositório.

- [`docs/README.md`](docs/README.md): índice da documentação, por assunto.
- [`specs/001-importacao-fila/spec.md`](specs/001-importacao-fila/spec.md): spec do fluxo 1, a entrada dos pedidos
  do dia.

## Trabalho com IA

O projeto é construído com apoio do Claude Code, com regras escritas no [`CLAUDE.md`](CLAUDE.md): spec antes do
código, teste antes da implementação e quem escreve não confere. Os subagentes ficam em `.claude/agents/` e as skills
em `.claude/skills/`.

## Créditos

Material de terceiros usado no repositório, com a licença de cada um:

- **Skills do Claude Code:** a lista completa, com autor, origem, versão e licença, está em
  [`.claude/skills/README.md`](.claude/skills/README.md). Inclui trabalho de Jesse Vincent (Superpowers, MIT),
  Cloudflare (security-audit, MIT), Peter Yang (no-ai-slop, MIT), Microsoft (playwright-cli, Apache-2.0), GHDaru
  (Maestro, MIT), forrestchang (karpathy-guidelines, MIT), Cherif Toujeni (c4-model, MIT), Jakub Krehel (better-*,
  MIT) e Paul Bakaus (impeccable, Apache-2.0).
- **Método de trabalho:** adaptado do [Maestro](https://github.com/GHDaru/maestro) (GHDaru, MIT).
- **Modelos de especificação:** traduzidos e adaptados do [Spec Kit](https://github.com/github/spec-kit) (GitHub, MIT).
- **Ideias de colegas do curso**, citadas onde foram usadas: organização da pasta `docs/` e piso de cobertura no CI
  (Lucas Klemke), matriz requisito → teste e modelo de ameaça (Leonardo), foco da revisão por risco (Vinícius
  Zanatta), verificação única do CI (Cauê Fernandes).

## Licença

MIT. Veja [LICENSE](LICENSE).
