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

## R-0009 · 16/11/2026 · Esqueleto do sistema montado

- Branch `feat/esqueleto-do-sistema`, saída da `dev` depois do merge do PR 10.
- Back-end em NestJS, com `/saude`, `/metrics`, logs em JSON, `helmet`, CORS fechado e limite de requisições.
  Front-end em React com Vite. Docker Compose com PostgreSQL, API, telas, Prometheus e Grafana.
- TDD: os seis arquivos de teste do back-end foram escritos antes do código e falharam porque os módulos não
  existiam. Depois do código, um teste falhou por um motivo real: no Express 5, a rota inexistente recebia a etiqueta
  `{/*splat}`. O middleware de métricas foi corrigido.
- Resultado: `npm run verificar` passou com 7 testes do domínio, 19 do back-end e 3 do front-end. A cobertura do
  back-end ficou em 96,8%. Os 2 testes do banco passaram com o PostgreSQL real no Docker.
- O ambiente completo foi testado na máquina do Hélio. A rota `/saude` respondeu 200 com o banco disponível. O Nginx
  devolveu 404 em `/api/metrics`. O Prometheus leu a API (situação "up"), e o Grafana respondeu.
- Prova: ADR [0013](adr/0013-estrutura-e-versoes-do-esqueleto.md), proposta e aguardando a aprovação do Hélio.

## R-0010 · 17/11/2026 · Correções do esqueleto depois das conferências

- O `revisor-de-seguranca` não achou risco alto e apontou 3 riscos médios. O `verificador` reprovou a primeira versão
  pelos mesmos pontos e por outros menores. A entrada R-0009 dizia que o Nginx devolvia 404 em `/api/metrics`. Isso
  valia só para o endereço exato: `/api/metrics/` e `/api/METRICS` passavam.
- TDD: os testes das correções foram escritos antes do código. Na primeira execução, 9 testes falharam e 2 arquivos de
  teste não encontraram o código, que ainda não existia.
- Correções:
  - As métricas saíram da porta pública e foram para uma porta interna (9464).
  - A API passou a confiar em um salto de proxy, e o Nginx envia só o IP real do cliente.
  - Os logs da API e do Nginx passaram a gravar só uma lista de campos permitidos, sem query string, sem cabeçalhos e
    sem IP.
  - O validador passou a conferir `NIVEL_DE_LOG` e `PORTA_DAS_METRICAS` e a recusar `1e3` e `0x10`.
  - As telas ganharam cabeçalhos de segurança, e o Nginx passou a rodar sem permissão de administrador.
  - Entraram o `.dockerignore`, a imagem da API sem dependências opcionais, os caminhos da cobertura para o Sonar e o
    Dependabot das imagens Docker.
- Prova no ambiente local, em 17/11/2026:
  - `npm run verificar` passou, com 42 testes do back-end e 1 pulado, e cobertura de 97,5%.
  - Todas as variações de `/metrics` responderam 404 pela porta pública.
  - Um pedido com nome e telefone fictícios na query string não deixou nenhum desses dados no log da API nem no do
    Nginx.
  - O contador do limite continuou o mesmo entre um pedido direto à API e um pedido pelo Nginx (96, 95, 94). Isso
    mostra que a API conta o cliente real atrás do Nginx.

## R-0011 · 17/11/2026 · Segunda conferência do esqueleto e correções

- A segunda conferência do `verificador` provou a maior parte das correções da R-0010. Ela também mostrou três
  afirmações da R-0010 que não eram verdade:
  - A imagem da API ainda levava a linha de comando do Prisma e o TypeScript. O `--omit=peer` não tinha efeito,
    porque o lockfile marca esses pacotes como "devOptional".
  - O log de erro do Nginx ainda gravava o IP e a query string. Só o log de acesso tinha sido trocado.
  - Os cabeçalhos de segurança do Nginx se somavam aos do helmet nas respostas da API, com valores em conflito.
- TDD: os testes novos foram escritos antes do código. Dois falharam pelo motivo certo: o limite com 400 algarismos
  virava "Infinity" sem erro, e o log ainda ignorava `/metrics`. Os testes do método POST e do erro 500 no servidor de
  métricas passaram logo de cara, porque o código já se comportava assim. Eles ficaram como proteção contra regressão.
- Correções:
  - A imagem da API passou a usar `--omit=dev --omit=optional`. A pasta `node_modules` caiu de 387,7 MB
    para 114,8 MB, e o único programa que ficou foi o `pino`.
  - O log de erro do Nginx passou a registrar só os erros críticos.
  - Os cabeçalhos de segurança do Nginx passaram a valer só para as telas.
  - O validador passou a recusar números grandes demais (`Number.isSafeInteger`).
  - O Sonar passou a deixar de fora da cobertura os arquivos que só iniciam a aplicação.
  - O Dependabot passou a cobrir as imagens do `docker-compose.yml`.
  - O CI ganhou a conferência automática do Nginx: a sintaxe, o 404 de `/api/metrics` e os cabeçalhos das telas.
- Prova no ambiente local, em 17/11/2026:
  - `npm run verificar` passou, com 46 testes do back-end e 1 pulado, e cobertura de 98,75%.
  - Cada cabeçalho de segurança aparece uma vez só em `/api/saude`.
  - Um corpo de 2 MB com nome fictício na query string recebeu 413. O log do Nginx ficou sem o nome e sem o IP.
  - A conferência do Nginx do CI passou na imagem local.

## R-0012 · 17/11/2026 · Terceira conferência e segunda revisão de segurança

- O `verificador` aprovou com ressalvas. O `revisor-de-seguranca` confirmou que os três riscos médios estão corrigidos
  e não achou risco alto nem médio.
- Os dois apontaram um defeito no `backend/Dockerfile`: o comando de instalação tinha um `\n` literal no lugar da
  quebra de linha. O build funcionava por acaso. A linha foi corrigida e a imagem foi reconstruída.
- Ajustes: o `--omit=peer` saiu do `Dockerfile`, porque não tinha efeito. O `.dockerignore` passou a deixar de fora o
  `.npmrc`. O log de acesso do Nginx ganhou o código e o tempo de resposta da API. As versões de desenvolvimento da
  raiz ficaram exatas.
- As ressalvas de risco baixo ficaram registradas em `docs/seguranca/README.md`, com o momento de resolver cada uma.
  A condição do proxy de borda para o limite de requisições ficou em `docs/deploy/README.md`.
- Prova: `npm run verificar` passou, e `npm audit` não achou falha conhecida. O log do Nginx gravou
  `"GET /api/saude HTTP/1.1" 200 38 0.004 upstream=200 0.004`, sem IP e sem query string.
