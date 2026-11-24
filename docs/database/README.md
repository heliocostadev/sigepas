# Banco de dados

PostgreSQL 16 com Prisma ([ADR 0003](../adr/0003-postgresql-com-prisma.md)). O esquema e as migrações entram com o
esqueleto do back-end.

## O que já está decidido

- **Identidade do pedido:** chave natural de oito colunas com contador de ocorrência
  ([ADR 0010](../adr/0010-chave-natural-do-pedido.md)). Reimportar o mesmo período atualiza o pedido e não o duplica.
- **Lote de importação:** cada envio de arquivo é um registro (arquivo, data, operador, contagens).
- **Dicionário de locais:** cidade e local oficiais, com a grafia de origem ligada a eles. A carga inicial vem do
  dicionário do sistema atual, só com nomes de cidades e locais
  ([ADR 0011](../adr/0011-dicionario-inicial-de-locais.md)).
- **Status do pedido** é um enum, não texto livre.
- **Acompanhante** é uma entidade própria, porque ocupa lugar no carro.

## Regras para o esquema

- Toda mudança de esquema é uma migração versionada do Prisma, revisada no PR.
- O CI confere se as migrações batem com o esquema (ideia do Leonardo, repositório
  [code-lab-project](https://github.com/leonsnw/code-lab-project)).
- Testes de integração rodam com PostgreSQL de verdade no CI, nunca com SQLite ou H2, que a linha proíbe.
- Nenhum dado real de paciente entra em migração, semente ou teste.
