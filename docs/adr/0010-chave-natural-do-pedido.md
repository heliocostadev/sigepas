# 0010. Identidade do pedido por chave natural de oito colunas

- **Situação:** aceita em 08/11/2026.
- **Redação:** proposta pela IA em 08/11/2026, a partir do registro de trabalho e dos planos da pasta TCC.
  O texto passa por revisão e ajuste de redação.
- **Fontes:** triagem das regras da Importação (08/11/2026), documentação da aba Importação do sistema atual
  (seção 3) e regra decidida com o setor em 27/08/2026.

## Contexto

O arquivo do OLOSTECH não traz número de pedido. O sistema atual apaga e reescreve os pedidos a cada importação. O
arquivo sai às 6h e às 13h. No sistema novo, a importação da tarde não pode duplicar os pedidos da manhã. Ela também
não pode retirar um pedido de um carro já montado.

## Decisão

O sistema identifica o pedido pelas **mesmas oito colunas do sistema atual**. São elas: data do compromisso, cidade,
hora, local de destino, objetivo, matrícula, nome e quantidade de pessoas. Um **contador de ocorrência** separa os
pedidos idênticos no mesmo dia. Reimportar o mesmo período atualiza o pedido e não o duplica.

## Alternativas consideradas

- **Posição da linha no arquivo:** não sobrevive a uma nova exportação.
- **Todas as colunas:** com essa chave, corrigir um telefone devolve à fila quem já está num carro. Além disso, o
  sistema pode alocar a mesma pessoa duas vezes.
- **Número do pedido do OLOSTECH:** é a chave ideal, mas o OLOSTECH não fornece esse número. Se o OLOSTECH passar a
  fornecer o número, uma ADR nova troca a chave.

## Consequências

- A medição no sistema atual mostrou que as oito colunas não colidiram em nenhuma data do arquivo real.
- Uma mudança de compromisso (hora, cidade, local ou objetivo) gera outro pedido, de propósito, porque a alocação
  antiga ficou errada.
