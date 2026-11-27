# 0009. O retorno não é gerenciado: a volta segue a ida

- **Situação:** aceita em 08/11/2026.
- **Redação:** proposta pela IA em 08/11/2026, a partir do registro de trabalho e dos planos da pasta TCC.
  O texto passa por revisão e ajuste de redação.
- **Fontes:** registro de trabalho de 08/11/2026 e plano de construção (seção 5).
- **Substituída em parte** pela [ADR 0020](0020-o-que-as-adrs-aceitas-previam-e-ainda-nao-esta-no-ar.md), proposta em
  27/11/2026.

## Contexto

Gerenciar o retorno exige lotação de volta, controle de intercorrências e tratamento dos pacientes que voltam em outro
carro.

## Decisão

A volta segue a mesma composição da ida. Não há lotação de retorno nem controle de intercorrências. Os imprevistos se
resolvem por encaixe manual.

## Alternativas consideradas

- **Retorno como viagem própria:** dobra o fluxo 2 e não é necessário para demonstrar o sistema.

## Consequências

- O modelo de dados tem só a viagem de ida. A guia informa que a volta é com o mesmo carro.
