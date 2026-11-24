# Glossário

Termos do setor de transportes e do sistema. Termo novo entra aqui no mesmo PR em que aparece pela primeira vez.

| Termo | Significado |
|---|---|
| **Alocar** | Colocar o pedido de um paciente (e os acompanhantes) num carro. O escopo do sistema é logística: o paciente é alocado, nunca "atendido" |
| **Chave natural do pedido** | Identidade do pedido formada por oito colunas do arquivo, com um contador para pedidos idênticos no mesmo dia. As colunas são data do compromisso, cidade, hora, local de destino, objetivo, matrícula, nome e quantidade de pessoas. A chave existe porque o OLOSTECH não manda número de pedido ([ADR 0010](../adr/0010-chave-natural-do-pedido.md)) |
| **Dicionário de locais** | Correspondência entre a grafia que chega no arquivo e a grafia oficial da cidade e do local |
| **Fila do dia** | Os pedidos de uma data que ainda não entraram em nenhum carro |
| **Gestor** | Papel com acesso a tudo, inclusive cadastros e escala |
| **Guia** | Documento do carro para o motorista: pacientes, horários, destinos |
| **Lote de importação** | Cada envio de arquivo: quem enviou, quando, quantas linhas entraram, foram rejeitadas ou ficaram para revisar |
| **OLOSTECH** | Sistema de onde o setor baixa o arquivo CSV com os pedidos de transporte, às 6h e às 13h |
| **Operador** | Papel do dia a dia: importar, montar carros, registrar remoções e ligações |
| **Pendência de local** | Pedido cuja cidade e local não têm correspondência no dicionário. Não impede a importação |
| **Remoção interna** | Transporte dentro de Joinville, confirmado por ligação, feito com motorista e ambulância |
| **SIGEPAS** | Sistema de Gestão de Transportes de Pacientes e Servidores. "SIGEPAS em Apps Script" é o que o setor usa. "SIGEPAS em arquitetura de servidor" é este repositório |
| **TFD** | Tratamento Fora do Domicílio: programa do SUS para o paciente fazer em outra cidade o tratamento que não existe no município |
| **UBSF** | Unidade Básica de Saúde da Família, de onde vêm os pedidos. Não use "posto" |
