# 0020. O que as ADRs aceitas previam e ainda não está no ar

- **Situação:** proposta em 27/11/2026. Substitui em parte as ADRs 0002, 0003, 0004, 0005, 0006, 0008, 0009 e 0011,
  só nos trechos citados abaixo.
- **Redação:** IA (Claude Code), em 27/11/2026, a partir da conferência da documentação contra o código da `main` no
  commit `3dbc261`.
- **Fontes:** decisões de 26/11/2026 (registro de trabalho, entrada de 26/11, tarde) e de 27/11/2026. Entrada R-0021
  do [`RASTREABILIDADE.md`](../RASTREABILIDADE.md). [ADR 0013](0013-estrutura-e-versoes-do-esqueleto.md) e
  [ADR 0016](0016-porte-das-telas-e-tempo-real.md). Os arquivos de código citados em cada item.

## Contexto

As ADRs de 0002 a 0011 foram escritas em 08/11/2026 e em 16/11/2026, antes da construção. Algumas afirmam no presente
coisas que o sistema no ar não faz. ADR aceita não se edita ([ADR 0001](0001-registrar-decisoes-em-adr.md)). Por
isso, a correção fica nesta ADR nova.

## Decisão

Cada item abaixo vale no lugar do trecho citado da ADR aceita. O que ainda não existe no ar fica como melhoria
futura, sem prazo.

1. **[ADR 0002](0002-back-end-em-nestjs.md).** A ADR fixa o "Node 20". O back-end roda no Node 24, desde o esqueleto
   ([ADR 0013](0013-estrutura-e-versoes-do-esqueleto.md)). As provas são `FROM node:24-alpine` no
   `backend/Dockerfile`, `"node": ">=24"` no `package.json` da raiz e `node-version: 24` no
   `.github/workflows/ci.yml`.
2. **[ADR 0003](0003-postgresql-com-prisma.md).** A ADR diz que "o CI confere se as migrações batem com o esquema".
   O CI aplica as migrações no PostgreSQL de teste com `prisma migrate deploy`. Os testes de integração rodam nesse
   banco. O CI não compara as migrações com o `schema.prisma`, e essa comparação é melhoria futura.
3. **[ADR 0004](0004-front-end-em-react-com-vite.md).** A ADR prevê "React com Vite, em TypeScript" e "o axe nos
   testes". Só a tela de entrada é React com TypeScript (`frontend/src/PaginaInicial.tsx`). As seis telas dos fluxos
   vieram do SIGEPAS em Apps Script, em JavaScript sem React (`frontend/src/sistema/telas/`), como descreve a ADR
   0016. O Vite empacota as duas partes. Não existe tela de remoção interna
   ([ADR 0018](0018-terceiro-fluxo-e-a-confirmacao-do-paciente.md)). Os testes não usam o axe. A conferência
   automática de acessibilidade (WCAG 2.1) com o axe é melhoria futura.
4. **[ADR 0005](0005-testes-com-vitest.md).** A ADR diz que "os fluxos de ponta a ponta usam Playwright". A API usa
   Supertest. A tela de entrada usa Testing Library, e as telas dos fluxos rodam no jsdom. Tudo roda no Vitest. Não
   há teste de ponta a ponta com Playwright, e o CI roda só o Vitest. Por isso, a regra da
   [ADR 0012](0012-metodo-de-trabalho-com-ia.md) sobre o teste de ponta a ponta que nasce da spec ainda não foi
   aplicada. O teste de ponta a ponta é melhoria futura, como a ADR 0016 já registra.
5. **[ADR 0006](0006-hospedagem-na-aws-com-terraform.md).** A ADR afirma a "cópia de segurança diária do PostgreSQL
   para o S3". A cópia não existe. O Terraform não cria bucket S3, e o Compose de produção não tem serviço de cópia.
   O volume do PostgreSQL fica só no disco da máquina. A cópia diária com teste de restauração é melhoria futura.
6. **[ADR 0008](0008-tres-fluxos-de-negocio.md).** A ADR prevê "linhas rejeitadas com motivo" no fluxo 1 e uma pasta
   em `specs/` para cada fluxo. A linha sem data válida não entra na importação e não é contada
   (`backend/src/importacao/importacao.service.ts`). O resultado traz o total de linhas importadas, os cancelados, os
   locais corrigidos e os locais pendentes. Ele não traz lista de linhas rejeitadas. O relatório das linhas
   rejeitadas com o motivo é melhoria futura. Só o fluxo 1 tem pasta em `specs/`. O fluxo 3 mudou na ADR 0018.
7. **[ADR 0009](0009-retorno-segue-a-ida.md).** A ADR diz que "o modelo de dados tem só a viagem de ida". Ela diz
   também que "a guia informa que a volta é com o mesmo carro". Não há viagem de volta separada, e a volta usa o
   mesmo carro da ida. Num carro que não é terceirizado, a escala pode indicar um segundo motorista para a volta. O
   model `Viagem` do `backend/prisma/schema.prisma` guarda esse dado em `doisMotoristas`, `motorista2` e
   `motorista2Fixado`. Nesse caso, a imagem da guia mostra o "Motorista (ida)" e o "Motorista (volta)". A guia não
   traz o texto de que a volta é com o mesmo carro, e esse texto é melhoria futura.
8. **[ADR 0011](0011-dicionario-inicial-de-locais.md).** A ADR diz que o dicionário é "carregado do sistema atual"
   por "uma semente do Prisma". Não há semente do Prisma nem carga do dicionário real. Na subida, a API grava quatro
   padronizações de locais fictícias, junto com veículos, motoristas e locais de embarque fictícios
   (`backend/src/inicializacao/`). Isso acontece quando a variável `SEMEAR_DADOS_FICTICIOS` vale `sim` e os cadastros
   de veículos e de motoristas estão vazios. A carga do dicionário real, conferido e sem dado pessoal, é melhoria
   futura. A sugestão por semelhança dentro da mesma cidade já existe (`POST /api/importacao/sugestoes-de-locais`).
   A consulta ao Google Maps não foi trazida.

## Alternativas consideradas

- **Editar as ADRs aceitas:** a ADR 0001 proíbe.
- **Uma ADR nova para cada item:** os oito itens corrigem fatos e não trazem decisão nova de arquitetura. Uma ADR só
  reúne a lista num lugar.

## Consequências

- O índice das ADRs marca cada ADR afetada como substituída em parte por esta.
- Esta ADR não muda código. Ela registra o estado da `main` no commit `3dbc261`, de 27/11/2026.
- Cada item que for feito entra numa entrada nova do [`RASTREABILIDADE.md`](../RASTREABILIDADE.md).
