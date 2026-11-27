# Especificações por fluxo

Cada fluxo de negócio tem uma pasta. Ninguém escreve código do fluxo antes de o `spec.md` ser aprovado. Os
modelos estão em [`_modelos/`](_modelos/README.md).

| Fluxo | Spec | Situação |
|---|---|---|
| 1. Do arquivo à fila | [`001-importacao-fila/spec.md`](001-importacao-fila/spec.md) | Aprovada em 16/11/2026. A seção 11 registra onde o sistema no ar difere da spec |
| 2. Do pedido ao carro escalado (motoristas, carros e escala) | Não escrita | Código portado do SIGEPAS em Apps Script para a entrega de 27/11/2026 |
| 3. Confirmação do paciente (confirmado ou não confirmado, sem WhatsApp) | Não escrita | Código portado do SIGEPAS em Apps Script para a entrega de 27/11/2026 |

## Situação na entrega de 27/11/2026

- **Escopo decidido em 26/11/2026.** O fluxo 3 passou a ser a confirmação do paciente, só com a marcação confirmado
  ou não confirmado. A remoção interna e os transportes dentro de Joinville saíram da entrega e são melhoria futura.
  Até então, o fluxo 3 era a remoção interna (decisão de 08/11/2026, ADR 0008).
- **Fluxos 2 e 3 portados sem spec.** Os fluxos 2 e 3 foram portados do SIGEPAS em Apps Script, na versão 18, sem
  `spec.md`, sem `plan.md` e sem `tasks.md`. Assim, o código desses fluxos não seguiu a regra do início desta página.
  As entradas R-0019 e R-0021 de [`RASTREABILIDADE.md`](../docs/RASTREABILIDADE.md) registram o porte. Os testes
  desses fluxos estão em `backend/src/fluxo-2-e-3-carros-e-confirmacao.test.ts` e em `frontend/src/sistema/teste/`.
- **Specs pendentes.** As specs dos fluxos 2 e 3 ainda não foram escritas e não têm data marcada.
