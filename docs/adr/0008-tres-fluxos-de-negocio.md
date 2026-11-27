# 0008. Três fluxos de negócio

- **Situação:** aceita em 08/11/2026.
- **Redação:** proposta pela IA em 08/11/2026, a partir do registro de trabalho e dos planos da pasta TCC.
  O autor do projeto revisa o texto e o ajusta com as próprias palavras.
- **Fontes:** registro de trabalho de 08/11/2026 e plano de construção (seção 5).

## Contexto

A linha exige três fluxos de negócio completos. O dia do setor tem cinco partes. São elas:
importação do CSV, montagem dos carros para as viagens fora de Joinville (com as edições), escala dos motoristas,
remoção interna e ligações.

## Decisão

1. **Do arquivo à fila:** importação do CSV, padronização, linhas rejeitadas com motivo e fila do dia.
2. **Do pedido ao carro escalado:** montagem do carro com lotação, edição e estorno. O fluxo também cobre o
   motorista e o veículo de cada carro, a guia e a escala do dia.
3. **Remoção interna:** pedido, resultado da ligação de confirmação, motorista e ambulância.

O fluxo principal do RFC vai do fluxo 1 ao fluxo 2.

## Alternativas consideradas

- **Escala completa como fluxo próprio:** é grande demais para o prazo. A escala mínima entra dentro do fluxo 2.
- **Ligações da véspera como fluxo:** ficam para depois de 30/11/2026. Se sobrar tempo, as ligações entram no fluxo 2
  como a situação de cada paciente.

## Consequências

- Cada fluxo tem uma pasta em `specs/`. Se o prazo apertar, corta-se requisito dentro do fluxo, nunca o fluxo.
