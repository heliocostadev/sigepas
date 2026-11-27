# 0011. Dicionário inicial de locais vindo do sistema atual

- **Situação:** aceita em 08/11/2026.
- **Redação:** proposta pela IA em 08/11/2026, a partir do registro de trabalho e dos planos da pasta TCC.
  O texto passa por revisão e ajuste de redação.
- **Fontes:** triagem das regras da Importação (08/11/2026).

## Contexto

A padronização de cidades e locais depende de um dicionário. O sistema atual já tem um, construído em meses de
operação. A revisão assistida de locais (sugestão por semelhança e Google Maps) ficou para depois de 30/11/2026.

## Decisão

O dicionário inicial é **carregado do sistema atual**. A exportação leva **só cidade, local e grafia**. Antes da carga,
o arquivo é conferido para garantir que não tem dado pessoal.

## Alternativas consideradas

- **Começar com o dicionário vazio:** toda importação vira uma lista grande de pendências.
- **Copiar a tabela inteira do sistema atual:** traz colunas desnecessárias de operador e de data.

## Consequências

- Uma semente do Prisma faz a carga, a partir do arquivo conferido.
- Locais novos entram como pendência, sem travar a importação (regra RN-007).
