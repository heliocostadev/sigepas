# 0003. PostgreSQL com Prisma

- **Situação:** aceita em 08/11/2026.
- **Redação:** proposta pela IA em 08/11/2026, a partir do registro de trabalho e dos planos da pasta TCC.
  O autor do projeto revisa o texto e o ajusta com as próprias palavras.
- **Fontes:** plano de construção de 08/11/2026 (seção 1) e direção da linha Web Apps do playbook.

## Contexto

O domínio é relacional: pedidos, lotes de importação, cidades, locais, carros, motoristas, escalas. A linha Web Apps
proíbe SQLite e H2.

## Decisão

O sistema usa **PostgreSQL 16**, acessado pelo **Prisma**, com o esquema num arquivo e migrações versionadas.

## Alternativas consideradas

- **SQLite e H2:** a linha proíbe os dois.

As duas alternativas abaixo não foram discutidas em 08/11/2026. A IA as acrescentou na redação desta ADR para
registrar por que o Prisma serve. O autor do projeto confirma ou retira cada uma na revisão:

- **TypeORM:** tem integração antiga com o NestJS, mas espalha o esquema em decoradores das entidades.
- **SQL escrito à mão:** dá mais controle, e também mais código para escrever e proteger contra injeção.

## Consequências

- O Prisma parametriza as consultas por padrão, o que ajuda contra injeção de SQL.
- O CI confere se as migrações batem com o esquema, e os testes de integração usam um banco PostgreSQL real.
