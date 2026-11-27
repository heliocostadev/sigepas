# 0007. Dois papéis: gestor e operador

- **Situação:** aceita em 08/11/2026.
- **Redação:** proposta pela IA em 08/11/2026, a partir do registro de trabalho e dos planos da pasta TCC.
  O texto passa por revisão e ajuste de redação.
- **Fontes:** registro de trabalho de 08/11/2026.
- **Substituída em parte** pela [ADR 0019](0019-toda-a-logistica-e-de-quem-trabalha-no-setor.md), proposta em
  27/11/2026.

## Contexto

O guia da prova pergunta onde uma rota é bloqueada para quem não tem permissão. No setor, todos importam o arquivo do
dia (regra RN-018 do sistema atual), mas cadastros e escala são da gestão.

## Decisão

O sistema tem dois papéis. O **operador** importa, monta carros e registra remoções e ligações. O **gestor** faz tudo o
que o operador faz, mais cadastros, escala e contas. O servidor decide a autorização, por um guard do NestJS.

## Alternativas consideradas

- **Um papel só:** não demonstra a autorização, que o guia da prova pergunta.
- **Papéis por unidade ou por motorista:** ficam fora do escopo dos três fluxos.

## Consequências

- Cada rota declara o papel exigido. Cada rota tem um teste que usa o papel errado e espera a resposta 403.
