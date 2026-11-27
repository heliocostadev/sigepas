# 0001. Registrar as decisões de arquitetura em ADRs

- **Situação:** aceita em 08/11/2026.
- **Redação:** proposta pela IA em 08/11/2026, a partir do registro de trabalho e dos planos da pasta TCC.
  O autor do projeto revisa o texto e o ajusta com as próprias palavras.
- **Fontes:** plano de construção de 08/11/2026 (seção 3) e método do Maestro (GHDaru, MIT).

## Contexto

A prova de autoria pergunta por que cada tecnologia foi escolhida e qual alternativa foi descartada (pergunta 2 do
guia do professor). Decisões tomadas em conversa se perdem, e decisões reescritas apagam o raciocínio da época.

## Decisão

Cada decisão de arquitetura vira um arquivo curto em `docs/adr/`, numerado, no modelo `0000-modelo.md`. ADR não se
edita depois de aceita: a correção é uma ADR nova.

## Alternativas consideradas

- **Registrar só no RFC:** o RFC é um documento básico e não guarda a história das mudanças.
- **Registrar só no registro de trabalho da pasta TCC:** esse registro fica fora do repositório, e o professor e os
  colegas leem o repositório.

## Consequências

- O `redator-tecnico` escreve a ADR no mesmo PR da mudança.
- O `docs/RASTREABILIDADE.md` aponta para cada ADR nova.
