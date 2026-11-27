# 0018. O terceiro fluxo é a confirmação do paciente, e a remoção interna fica fora da entrega

- **Situação:** proposta em 27/11/2026. Substitui em parte a [ADR 0008](0008-tres-fluxos-de-negocio.md), no item do
  fluxo 3.
- **Redação:** IA (Claude Code), em 27/11/2026, a partir das decisões de 26/11/2026 e de 27/11/2026. A redação
  também usou a leitura do código da `main` no commit `3dbc261`.
- **Fontes:** decisão de 26/11/2026 (registro de trabalho, entrada de 26/11, tarde). Ela fixou os três fluxos: do
  arquivo à fila, do pedido ao carro escalado e confirmação do paciente. Entrada R-0021 do
  [`RASTREABILIDADE.md`](../RASTREABILIDADE.md), de 27/11/2026. [ADR 0016](0016-porte-das-telas-e-tempo-real.md).

## Contexto

A ADR 0008, aceita em 08/11/2026, definiu o fluxo 3 como remoção interna: pedido, resultado da ligação de
confirmação, motorista e ambulância. Em 26/11/2026, a entrega foi marcada para 27/11/2026, e a remoção interna não
cabia no prazo. A ADR 0008 continua com o texto de 08/11/2026, porque ADR aceita não se edita (ADR 0001).

Em 27/11/2026, a entrada R-0021 fixou a base do porte na versão 18 do SIGEPAS em Apps Script. As versões 38, 39 e
42, que tratam de WhatsApp e da remoção interna, ficaram fora do porte.

## Decisão

Os três fluxos da entrega são estes:

1. **Do arquivo à fila:** importação do arquivo CSV do OLOSTECH até a fila do dia.
2. **Do pedido ao carro escalado:** montagem dos carros, motoristas, veículos e escala.
3. **Confirmação do paciente:** a ligação para o paciente termina na marcação de confirmado ou de não confirmado,
   sem WhatsApp.

A remoção interna e os transportes dentro de Joinville ficam fora desta entrega e são melhoria futura. O sistema usa
só dados fictícios.

## Alternativas consideradas

- **Manter a remoção interna como fluxo 3:** a estimativa dada em 26/11/2026 foi de 4 a 6 horas de trabalho, além
  dos três fluxos. O prazo da entrega era 27/11/2026.
- **Confirmação do paciente com WhatsApp:** as versões do SIGEPAS em Apps Script que tratam de WhatsApp ficaram fora
  da base do porte (R-0021).

## Consequências

- O fluxo 3 é a rota `POST /api/operacao/confirmar-passageiro`. O servidor aceita só as situações Pendente,
  Confirmado, Não atende, Não confirmado e Cancelado (`backend/src/operacao/operacao.service.ts`).
- A tela Confirmação e Guias de Viagens mostra os botões Confirmou, Não atende e Cancelar. Os botões de confirmação
  por WhatsApp ficam escondidos (`#guiaBtnConfZap` e `#guiaTabBtnZap`, em `frontend/public/sistema/principal.css`).
- O teste `backend/src/fluxo-2-e-3-carros-e-confirmacao.test.ts` confere os fluxos 2 e 3 com o PostgreSQL real.
- Não existe tabela, rota nem tela de remoção interna. O pedido com destino em Joinville não entra na fila de
  viagens externas (`ehDemandaInterna`, em `backend/src/regras/regras-do-setor.ts`).
- Só o fluxo 1 tem spec, em `specs/001-importacao-fila/`. Os fluxos 2 e 3 ainda não têm `spec.md`.
