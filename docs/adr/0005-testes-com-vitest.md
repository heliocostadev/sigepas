# 0005. Testes com Vitest nos dois lados

- **Situação:** aceita em 16/11/2026, depois de uma prova de conceito.
- **Redação:** proposta pela IA em 08/11/2026 e atualizada em 16/11/2026 com o resultado da prova de conceito.
  O autor do projeto revisa o texto e o ajusta com as próprias palavras.
- **Fontes:** plano de construção de 08/11/2026 (seção 1) e entrada R-0007 do
  [`RASTREABILIDADE.md`](../RASTREABILIDADE.md).

## Contexto

A linha exige 75% de cobertura no back-end e 25% no front-end, medidas separadamente. O núcleo de domínio já usa
Vitest, com 7 testes na `main` e os testes dos parsers nos PRs 1 a 3.

O NestJS cria o projeto com o Jest por padrão. A injeção de dependência do NestJS depende dos metadados dos
decoradores. Por isso, um teste foi pedido antes da decisão.

## Decisão

O projeto usa **Vitest** no back-end e no front-end. No NestJS, o Vitest roda com o plugin SWC (`unplugin-swc`), como
a documentação oficial do NestJS descreve. A API usa Supertest, as telas usam Testing Library e os fluxos de ponta a
ponta usam Playwright.

O back-end também tem um **teste de guarda**. Ele lê os metadados do construtor de um serviço (`design:paramtypes`) e
falha se os metadados deixarem de ser gerados.

## Resultado da prova de conceito (16/11/2026)

- Versões: NestJS 12.5.1, Vitest 5.1.0, Vite 8.3.8, unplugin-swc 2.0.0 e Supertest 7.3.2.
- Com o plugin SWC, os testes de injeção de dependência, de troca do serviço por um falso e da rota HTTP passaram. A
  cobertura gerou o relatório `lcov`.
- Sem o plugin SWC, os mesmos testes também passaram. O Vitest 5 gerou os metadados sozinho, mas a prova de conceito
  não identificou qual componente faz isso.

## Alternativas consideradas

- **Vitest sem o plugin SWC:** funciona na versão testada e tem duas dependências a menos. Ela não foi escolhida,
  porque o comportamento não está documentado e pode mudar numa atualização.
- **Jest no back-end:** é o padrão do NestJS e funciona com os decoradores sem configuração extra. O projeto não o
  escolheu porque exige uma segunda ferramenta, já que o front-end usa Vite. Também exige converter os testes que já
  existem.

## Consequências

- Só uma ferramenta precisa ser aprendida e explicada, nos dois lados.
- O relatório `lcov` alimenta o SonarCloud.
- O plugin SWC acrescenta duas dependências de desenvolvimento (`unplugin-swc` e `@swc/core`) e cerca de 0,2 segundo
  por execução.
- Se o teste de guarda falhar, a causa deve ser investigada antes de qualquer outra mudança (`diagnose-before-fix`).
