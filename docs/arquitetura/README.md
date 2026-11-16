# Arquitetura

## Visão geral

| Camada | Tecnologia | ADR |
|---|---|---|
| Front-end | React com Vite, TypeScript, servido por Nginx | [0004](../adr/0004-front-end-em-react-com-vite.md) |
| Back-end | Node 20, TypeScript, NestJS | [0002](../adr/0002-back-end-em-nestjs.md) |
| Banco | PostgreSQL 16, com Prisma (esquema e migrações versionadas) | [0003](../adr/0003-postgresql-com-prisma.md) |
| Núcleo de domínio | TypeScript puro, sem framework e sem banco, em `src/dominio/` | |
| Testes | Vitest nos dois lados, Supertest na API, Testing Library nas telas, Playwright de ponta a ponta | [0005](../adr/0005-testes-com-vitest.md) |
| Empacotamento | Docker Compose: API, front-end, PostgreSQL, Prometheus e Grafana | [0006](../adr/0006-hospedagem-na-aws-com-terraform.md) |
| Hospedagem | AWS EC2, infraestrutura em Terraform, deploy pelo Systems Manager, sem SSH | [0006](../adr/0006-hospedagem-na-aws-com-terraform.md) |

## Diagramas C4

Os diagramas são escritos com a skill `c4-model`, em Mermaid, à medida que o sistema existe:

- Nível 1 (contexto) e nível 2 (contêineres): até a orientação de 12/11/2026, para o RFC.
- Nível 3 (componentes do back-end): entre 23/11 e 29/11/2026.

## Organização do código

A organização é definida no `plan.md` do fluxo 1, quando o esqueleto for montado. Princípio já decidido: as regras de
negócio ficam no núcleo de domínio e são testadas sem banco. O NestJS e o Prisma ficam em volta do núcleo.
