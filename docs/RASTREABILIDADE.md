# Rastreabilidade

Este arquivo é o registro que **só cresce**: cada decisão, teste importante e deploy, com a prova ao lado. Nada é
apagado nem reescrito. A correção é uma entrada nova que cita a anterior. A ideia vem do Maestro (GHDaru, MIT), no
mesmo formato que o Hélio usa no projeto de estágio.

Formato de cada entrada: número, data, o que aconteceu, a prova (commit, PR, issue, ADR, saída de comando).

---

## R-0001 · 08/11/2026 · Estado do repositório antes da construção em NestJS

- Na `main`: o núcleo de domínio com `src/dominio/texto.ts` e 7 testes (commit `4223f31`).
- Em revisão, com as correções da N2 do PAC VIII:
  - Datas e horas: [PR 1](https://github.com/heliocostadev/sigepas/pull/1), commits `a3598bc` (issue 5) e `e490459`
    (issue 8).
  - Status do pedido: [PR 2](https://github.com/heliocostadev/sigepas/pull/2), commits `2262d8e` (issue 4),
    `d2f0b1f` (issue 6) e `bcc5065` (issue 9).
  - Padronização de locais: [PR 3](https://github.com/heliocostadev/sigepas/pull/3), commit `082f586` (issue 7).
- Prova: `git log` e `git branch -r --contains` de cada commit, e a linha "Refs #N" da mensagem, conferidos em
  08/11/2026.

## R-0002 · 08/11/2026 · Stack, hospedagem e testes decididos

- Decisões do Hélio: NestJS, PostgreSQL com Prisma, React com Vite, AWS EC2 com Terraform e deploy pelo Systems
  Manager, sem SSH. O Vitest está no plano de construção e aguarda a aprovação da ADR 0005.
- Prova: ADRs [0002](adr/0002-back-end-em-nestjs.md), [0003](adr/0003-postgresql-com-prisma.md),
  [0004](adr/0004-front-end-em-react-com-vite.md), [0005](adr/0005-testes-com-vitest.md) e
  [0006](adr/0006-hospedagem-na-aws-com-terraform.md).

## R-0003 · 08/11/2026 · Papéis, fluxos e retorno decididos

- Decisões do Hélio: papéis gestor e operador, e três fluxos (do arquivo à fila, do pedido ao carro escalado, remoção
  interna). Outra decisão do Hélio: a volta segue a ida.
- Prova: ADRs [0007](adr/0007-dois-papeis-gestor-e-operador.md), [0008](adr/0008-tres-fluxos-de-negocio.md) e
  [0009](adr/0009-retorno-segue-a-ida.md).

## R-0004 · 08/11/2026 · Regras da importação decididas

- Decisões do Hélio na triagem das regras da Importação: a chave natural de oito colunas com contador de ocorrência e
  o dicionário inicial. O dicionário inicial é carregado do sistema atual, sem dado pessoal. As demais regras seguem a
  recomendação da triagem até a aprovação do `spec.md` do fluxo 1.
- Prova: ADRs [0010](adr/0010-chave-natural-do-pedido.md) e [0011](adr/0011-dicionario-inicial-de-locais.md), e
  [`specs/001-importacao-fila/spec.md`](../specs/001-importacao-fila/spec.md).

## R-0005 · 08/11/2026 · Ambiente de trabalho da IA montado no repositório

- Decisão do Hélio: Maestro enxuto, cinco subagentes, skills dentro do repositório, regra de idioma e ordem de
  precedência. O Hélio também aprovou seis ferramentas externas depois da avaliação de 24 IAs do GitHub e de três
  repositórios indicados por ele.
- O ambiente foi montado na branch `claude/ambiente-de-trabalho-da-ia-a1cf0a`, sem código de aplicação. Entraram o
  `CLAUDE.md`, os cinco subagentes e 23 skills (5 nossas e 18 de terceiros, com autor e licença). Entraram também
  dois hooks, modelos de issue e de PR, CI com verificação única, gitleaks, CodeQL e Dependabot. Entraram ainda a
  configuração do SonarCloud (desligado até a conta existir), esta pasta `docs/` e a spec do fluxo 1. **Ficaram de
  fora:** o Terraform (escrito com o esqueleto) e a instalação do programa `playwright-cli` (com o front-end).
- Prova: ADR [0012](adr/0012-metodo-de-trabalho-com-ia.md) e [`.claude/skills/README.md`](../.claude/skills/README.md).
  No teste de 08/11/2026, o hook `bloquear-segredo-no-commit` barrou o commit com `.env`, chave da AWS e senha de
  banco remoto. O mesmo hook liberou o endereço local do Compose. No teste em linha de comando, o `scripts/conferir-mensagens-de-commit.mjs`
  aprovou os 5 commits do PR 2 e recusou "ajustes gerais". O `verificador` conferiu o trabalho em contexto novo e
  reprovou a primeira versão por três defeitos. O job de mensagens de commit lia o merge de teste do GitHub. O hook
  não cobria o PowerShell nem `git add` e `git commit` no mesmo comando. A matriz da spec 001 estava incompleta. Os
  três defeitos foram corrigidos no mesmo dia. Na reconferência, o `verificador` aprovou com ressalvas. As ressalvas
  de texto foram corrigidas. Fica registrado que o hook não vê arquivo ignorado forçado com `git add -f` (o gitleaks
  cobre esse caso). O CI só será conferido de fato no primeiro PR desta branch.

## R-0006 · 16/11/2026 · Spec do fluxo 1 aprovada

- O Hélio leu a spec do fluxo 1 e a aprovou: "eu li o fluxo 1 gostei, aprovo".
- A aprovação inclui os quatro pontos propostos pela spec:
  - o pedido ausente na importação seguinte fica marcado e não é apagado.
  - os limites são de 5 MB por arquivo e de 5 segundos por importação.
  - o arquivo enviado não é guardado.
  - a entrada é feita com e-mail e senha.
- A aprovação também fecha, conforme a recomendação, as regras da triagem da Importação que estavam sem decisão.
- Prova: [`specs/001-importacao-fila/spec.md`](../specs/001-importacao-fila/spec.md), campo "Situação".

## R-0007 · 16/11/2026 · Prova de conceito: NestJS com Vitest

- O Hélio pediu um teste antes de decidir entre o Vitest e o Jest (ADR 0005).
- A prova de conceito ficou fora do repositório, na pasta de rascunho da conversa. Ela tem dois serviços do NestJS
  ligados por injeção de dependência, uma rota HTTP e três testes. Os testes cobrem a injeção, a troca do serviço por
  um falso e a rota pelo Supertest.
- Versões instaladas: NestJS 12.5.1, Vitest 5.1.0, Vite 8.3.8, unplugin-swc 2.0.0, @swc/core 1.16.22,
  Supertest 7.3.2 e TypeScript 7.0.2.
- Resultado com o plugin SWC: 4 testes passaram, com cobertura de 100% e o relatório `coverage/lcov.info` gerado.
- Resultado sem o plugin SWC: os mesmos testes também passaram. Um teste extra leu os metadados do construtor
  (`design:paramtypes = [ 'RelogioService' ]`). O Vitest 5 gerou os metadados mesmo com `emitDecoratorMetadata`
  desligado e sem `tsconfig.json`. A conversa não identificou qual componente gera esses metadados.
- Tempo de execução: 1,96 s sem o plugin e 2,14 s com o plugin.

## R-0008 · 16/11/2026 · Vitest com o plugin SWC decidido

- Depois da prova de conceito (R-0007), o Hélio decidiu: Vitest nos dois lados, com o plugin SWC no NestJS. O
  back-end também terá um teste de guarda que lê os metadados do construtor.
- Prova: ADR [0005](adr/0005-testes-com-vitest.md), agora aceita. A entrada R-0002 registrava o Vitest como pendente.
