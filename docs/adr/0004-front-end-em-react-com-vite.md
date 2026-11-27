# 0004. Front-end em React com Vite

- **Situação:** aceita em 08/11/2026.
- **Redação:** proposta pela IA em 08/11/2026, a partir do registro de trabalho e dos planos da pasta TCC.
  O autor do projeto revisa o texto e o ajusta com as próprias palavras.
- **Fontes:** registro de trabalho de 08/11/2026 e plano de construção (seção 1).

## Contexto

"Frameworks modernos" é item desejável da linha Web Apps. As telas são poucas: entrada, importação, fila do dia,
montagem do carro, remoção interna, guia.

## Decisão

O front-end usa **React com Vite**, em TypeScript, servido por Nginx no Docker Compose.

## Alternativas consideradas

As alternativas abaixo não foram discutidas em 08/11/2026. A IA as acrescentou na redação desta ADR, e o autor do
projeto confirma ou retira cada uma na revisão:

- **Páginas montadas no servidor:** são mais simples, mas não usam o framework moderno que a linha valoriza.
- **Next.js:** traz renderização no servidor e rotas de API de que o projeto não precisa, já que a API é o NestJS.

## Consequências

- O design system do SIGEPAS em Apps Script é o ponto de partida das telas.
- A acessibilidade (WCAG 2.1) vale desde a primeira tela, com a skill `better-accessibility` e o axe nos testes.
