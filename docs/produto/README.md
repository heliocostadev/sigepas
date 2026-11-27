# Produto

## O problema

O setor de transportes da Secretaria de Saúde de Joinville recebe todos os dias do OLOSTECH a lista de pedidos de
transporte de pacientes. Os pedidos são para consultas, exames e tratamentos em outras cidades. O setor precisa
transformar essa lista em carros: quem vai em qual veículo, com qual motorista, saindo a que horas. O SIGEPAS em Apps
Script já faz isso numa planilha e é usado no setor. Este repositório constrói o
mesmo sistema em arquitetura de servidor, para fim acadêmico. Os dois não se substituem.

As regras trazidas para cá são as da versão 18 do SIGEPAS em Apps Script (decisão de 27/11/2026, registrada na
R-0021 do [`RASTREABILIDADE.md`](../RASTREABILIDADE.md)).

## Papéis (decisão de 08/11/2026, com a premissa de 27/11/2026)

A premissa do setor de transportes é que todos que trabalham nele sabem fazer a logística de quem pede a viagem. Por
isso, a logística inteira fica com os dois papéis.

| Papel | O que faz |
|---|---|
| **Operador** | Toda a logística: importa o arquivo, trabalha a fila, monta os carros, faz a escala, marca a confirmação e emite as guias |
| **Gestor** | Tudo o que o operador faz. Só o gestor faz alterações na tela Configurações: carros, motoristas, locais de embarque, calendário e padronização de locais |

A decisão sobre um local pendente, na revisão de locais da importação, também grava a padronização de locais. Essa
decisão é parte da logística e fica com os dois papéis.

Na API, só as seis rotas que alteram a tela Configurações levam a marca `@SoGestor` e recusam o
operador. As rotas marcadas com `@Publica` (entrar, sair e saúde) não exigem sessão. As outras rotas exigem a sessão
e aceitam os dois papéis. As contas são criadas no servidor pelo comando `criar-conta`, e não por uma tela. A decisão
original está na [ADR 0007](../adr/0007-dois-papeis-gestor-e-operador.md). A divisão atual está na
[ADR 0019](../adr/0019-toda-a-logistica-e-de-quem-trabalha-no-setor.md). O login e a sessão estão na
[ADR 0015](../adr/0015-login-e-sessao-no-servidor.md).

## Os três fluxos (decisão de 26/11/2026)

| Fluxo | De ponta a ponta | Spec |
|---|---|---|
| **1. Do arquivo à fila** | Login. Envio do CSV do dia. Interpretação de datas, status e locais. Fila do dia. Pendente: relatório das linhas rejeitadas com o motivo (hoje a linha sem data válida não entra e não é contada) | [`specs/001-importacao-fila`](../../specs/001-importacao-fila/spec.md) |
| **2. Do pedido ao carro escalado** | Viagem para uma cidade e data. Alocação respeitando a lotação. Edição e estorno. Motorista e veículo de cada carro. Guia e escala do dia | Pendente. O código veio do SIGEPAS em Apps Script antes da spec |
| **3. Confirmação do paciente** | Ligação para o paciente da viagem. Marcação de confirmado ou não confirmado. Sem WhatsApp | Pendente. O código veio do SIGEPAS em Apps Script antes da spec |

Até 26/11/2026, o fluxo 3 era a remoção interna (decisão de 08/11/2026). Em 26/11/2026, a remoção interna e os
transportes dentro de Joinville saíram desta entrega e passaram a ser melhoria futura. O sistema no ar só tira esses
pedidos da fila do dia e mostra na escala os motoristas que ficam na remoção interna.

O fluxo principal do RFC vai do fluxo 1 ao fluxo 2: do arquivo do OLOSTECH ao carro escalado com a guia. O sistema não
cadastra a viagem de volta: a volta usa o mesmo carro da ida ([ADR 0009](../adr/0009-retorno-segue-a-ida.md)). Em
viagem longa com carro público, a escala pode indicar um segundo motorista para a volta.

## Melhorias futuras

Ficam para depois de 30/11/2026, sem prazo definido:

- a remoção interna e os transportes dentro de Joinville
- a lista de tarefas
- o envio de mensagens por WhatsApp

A confirmação do paciente, só com confirmado ou não confirmado, e a formação da escala já estão no ar.

## Glossário

Os termos do setor estão em [`glossario.md`](glossario.md).
