# 0002. Back-end em NestJS

- **Situação:** aceita em 08/11/2026.
- **Redação:** proposta pela IA em 08/11/2026, a partir do registro de trabalho e dos planos da pasta TCC.
  O texto passa por revisão e ajuste de redação.
- **Fontes:** registro de trabalho de 08/11/2026 e plano de construção (seção 1).

## Contexto

O back-end precisa de API HTTP, autenticação, autorização por papel, validação de entrada e testes. Cada escolha
precisa ser explicada na prova de autoria.

## Decisão

O back-end usa Node 20 com TypeScript e **NestJS**.

## Alternativas consideradas

- **Fastify**, proposto antes: é mais leve e tem menos conceitos para aprender. O NestJS foi escolhido por três
  motivos. O mercado pede mais o NestJS. O RFC do tema anterior já o citava. O professor elogiou o NestJS. O
  NestJS também organiza por padrão o que o projeto precisa: módulos, injeção de dependência, guards para os papéis e
  pipes de validação. Este último ponto foi acrescentado pela IA na redação desta ADR, e deve ser confirmado ou
  retirado na revisão.
- **Express puro:** exige montar à mão a estrutura que o NestJS já traz.

## Consequências

- Custo aceito: módulos, injeção de dependência, decoradores e guards são conceitos a mais para aprender e explicar.
  O `explicador` cobre esses conceitos ao fim de cada tarefa.
- Cada fluxo tem menos requisitos, para caber no prazo de 30/11/2026. Corta-se requisito, nunca teste ou segurança.
- O núcleo de domínio continua em TypeScript puro, sem depender do NestJS.
