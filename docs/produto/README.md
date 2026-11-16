# Produto

## O problema

O setor de transportes da Secretaria de Saúde de Joinville recebe todos os dias do OLOSTECH a lista de pedidos de
transporte de pacientes. Os pedidos são para consultas, exames e tratamentos em outras cidades. O setor precisa
transformar essa lista em carros: quem vai em qual veículo, com qual motorista, saindo a que horas. O SIGEPAS em Apps
Script, construído pelo Hélio no estágio, já faz isso numa planilha e é usado no setor. Este repositório constrói o
mesmo sistema em arquitetura de servidor, para fim acadêmico. Os dois não se substituem.

## Papéis (decisão de 08/11/2026)

| Papel | O que faz |
|---|---|
| **Operador** | Importa o arquivo do dia, monta os carros, registra remoções internas e ligações |
| **Gestor** | Tudo o que o operador faz, mais cadastros, escala e consultas de gestão |

O detalhe está na [ADR 0007](../adr/0007-dois-papeis-gestor-e-operador.md).

## Os três fluxos (decisão de 08/11/2026)

| Fluxo | De ponta a ponta | Spec |
|---|---|---|
| **1. Do arquivo à fila** | Login do operador. Envio do CSV do dia. Interpretação de datas, status e locais. Linhas rejeitadas com o motivo. Fila do dia | [`specs/001-importacao-fila`](../../specs/001-importacao-fila/spec.md) |
| **2. Do pedido ao carro escalado** | Viagem para uma cidade e data. Alocação respeitando a lotação. Edição e estorno. Motorista e veículo de cada carro. Guia e escala do dia | A escrever |
| **3. Remoção interna** | Pedido dentro de Joinville. Resultado da ligação de confirmação. Motorista e ambulância. Guia | A escrever |

O fluxo principal do RFC vai do fluxo 1 ao fluxo 2: do arquivo do OLOSTECH ao carro escalado com a guia. O sistema não
gerencia o retorno: a volta segue a composição da ida ([ADR 0009](../adr/0009-retorno-segue-a-ida.md)).

Ficam para depois de 30/11/2026: as ligações da véspera das viagens externas, a formação completa da escala e a lista
de tarefas.

## Glossário

Os termos do setor estão em [`glossario.md`](glossario.md).
