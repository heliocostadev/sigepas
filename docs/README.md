# Documentação do SIGEPAS em arquitetura de servidor

A documentação está organizada por assunto, na divisão usada pelo Lucas Klemke no repositório
[crm-advocacia](https://github.com/LucasKlemke/crm-advocacia). Essa divisão dá a cada exigência do professor um lugar
óbvio. Esta pasta é publicada na Wiki do GitHub a cada merge na `main` (quando a Wiki estiver ligada).

| Pasta | O que tem |
|---|---|
| [`produto/`](produto/README.md) | O problema, os três fluxos, os papéis, o glossário do setor |
| [`arquitetura/`](arquitetura/README.md) | Visão geral, diagramas C4 e a organização em módulos |
| [`adr/`](adr/README.md) | Cada decisão de arquitetura, com o porquê e a alternativa descartada |
| [`database/`](database/README.md) | Modelo de dados, esquema do Prisma, migrações, chave natural do pedido |
| [`app/`](app/README.md) | Como rodar o projeto na máquina, variáveis de ambiente, estrutura de pastas |
| [`testes/`](testes/estrategia-de-testes.md) | Estratégia de testes, TDD em dois ciclos, cobertura, teste de mutação |
| [`qualidade/`](qualidade/README.md) | Portões do CI, SonarCloud, observabilidade |
| [`seguranca/`](seguranca/README.md) | Modelo de ameaça, LGPD, revisão de segurança |
| [`deploy/`](deploy/README.md) | Hospedagem na AWS, Terraform, deploy automático e como voltar uma versão |
| [`git/`](git/README.md) | Branches, commits, PRs e a escrita dos textos publicados |
| [`RASTREABILIDADE.md`](RASTREABILIDADE.md) | Registro que só cresce: cada decisão, teste e deploy com a prova ao lado |

## Onde cada exigência do professor está

| Exigência (playbook, linha Web Apps) | Onde |
|---|---|
| Três fluxos de negócio completos | [`produto/README.md`](produto/README.md) e [`../specs/`](../specs/) |
| Requisitos e histórias de usuário | `spec.md` de cada fluxo em [`../specs/`](../specs/) |
| C4 | [`arquitetura/README.md`](arquitetura/README.md) |
| Decisões técnicas | [`adr/`](adr/README.md) |
| TDD com 75% no back-end e 25% no front-end | [`testes/estrategia-de-testes.md`](testes/estrategia-de-testes.md) |
| CI/CD e análise estática | [`qualidade/README.md`](qualidade/README.md) e [`../.github/workflows/`](../.github/workflows/) |
| Observabilidade | [`qualidade/README.md`](qualidade/README.md) |
| Deploy público e instruções de deploy | [`deploy/README.md`](deploy/README.md) |
| LGPD, WCAG 2.1, licenças e OWASP | [`seguranca/README.md`](seguranca/README.md), [`../.claude/skills/README.md`](../.claude/skills/README.md) |

## De onde vêm as regras

O sistema em uso no setor (o SIGEPAS em Apps Script) foi documentado tela por tela. A documentação traz as regras de
negócio numeradas (`RN-001` em diante, com o código da aba, como `RN-IMP-04`). Ela traz também os casos-limite e o
que **não** deve ser reproduzido aqui. Essa documentação fica na pasta do TCC, fora deste repositório. O que cada
fluxo usa dela é trazido para o `spec.md` do fluxo, com a origem de cada requisito.
