# Glossário

Termos do setor de transportes e do sistema. Termo novo entra aqui no mesmo PR em que aparece pela primeira vez.

| Termo | Significado |
|---|---|
| **Alocar** | Colocar o pedido de um paciente (e os acompanhantes) num carro. O escopo do sistema é logística: o paciente é alocado, nunca "atendido" |
| **Chave natural do pedido** | Identidade do pedido formada por oito colunas do arquivo, com um contador para pedidos idênticos no mesmo dia. As colunas são data do compromisso, cidade, hora, local de destino, objetivo, matrícula, nome e quantidade de pessoas. A chave existe porque o OLOSTECH não manda número de pedido ([ADR 0010](../adr/0010-chave-natural-do-pedido.md)) |
| **Confirmação do paciente** | Fluxo 3 desta entrega: a ligação para o paciente da viagem termina com a marcação de confirmado ou não confirmado. Não usa WhatsApp (decisão de 26/11/2026) |
| **Dicionário de locais** | Correspondência entre a grafia que chega no arquivo e a grafia oficial da cidade e do local |
| **Escala** | Distribuição dos motoristas do dia entre os carros e a remoção interna. A formação da escala segue um rodízio, e o motorista fixado num carro não é trocado pelo rodízio |
| **Fila do dia** | Os pedidos de uma data que ainda não entraram em nenhum carro. Os pedidos com destino em Joinville não entram na fila (veja Remoção interna) |
| **Gestor** | Papel que faz toda a logística, como o operador. Só o gestor faz alterações na tela Configurações: carros, motoristas, locais de embarque, calendário e padronização de locais. A decisão sobre um local pendente, na revisão de locais da importação, fica com os dois papéis |
| **Guia** | Documento do carro para o motorista: pacientes, horários, destinos |
| **Lote de importação** | Cada envio de arquivo: quem enviou, quando, quantas linhas entraram, quantas vieram canceladas e quantas tiveram o local corrigido pelo dicionário |
| **OLOSTECH** | Sistema de onde o setor baixa o arquivo CSV com os pedidos de transporte, às 6h e às 13h |
| **Operador** | Papel que faz toda a logística do dia: importar, trabalhar a fila, montar carros, fazer a escala, marcar a confirmação e emitir as guias |
| **Pendência de local** | Pedido cuja cidade e local não têm correspondência no dicionário. Não impede a importação |
| **Remoção interna** | Transporte dentro de Joinville, feito com motorista e ambulância. Fica fora desta entrega e é melhoria futura (decisão de 26/11/2026). O sistema só tira esses pedidos da fila do dia e mostra na escala os motoristas que ficam na remoção interna |
| **SIGEPAS** | Sistema de Gestão de Transportes de Pacientes e Servidores. "SIGEPAS em Apps Script" é o que o setor usa. "SIGEPAS em arquitetura de servidor" é este repositório |
| **TFD** | Tratamento Fora do Domicílio: programa do SUS para o paciente fazer em outra cidade o tratamento que não existe no município |
| **UBSF** | Unidade Básica de Saúde da Família, de onde vêm os pedidos. Não use "posto" |
