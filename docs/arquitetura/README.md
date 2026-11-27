# Arquitetura

## Visão geral

| Camada | Tecnologia | ADR |
|---|---|---|
| Front-end | React 19 com Vite (tela de entrada) e as seis telas trazidas do SIGEPAS em Apps Script, em módulos JavaScript, servidas por Nginx | [0004](../adr/0004-front-end-em-react-com-vite.md), [0016](../adr/0016-porte-das-telas-e-tempo-real.md) |
| Back-end | Node 24, TypeScript, NestJS 12 | [0002](../adr/0002-back-end-em-nestjs.md) |
| Banco | PostgreSQL 16, com Prisma 7 (esquema e migrações versionadas) | [0003](../adr/0003-postgresql-com-prisma.md) |
| Regras do setor | TypeScript puro, sem framework e sem banco, em `backend/src/regras/` | |
| Login | Sessão no servidor, cookie `__Host-` HttpOnly, senha com scrypt, papéis gestor e operador | [0007](../adr/0007-dois-papeis-gestor-e-operador.md), [0015](../adr/0015-login-e-sessao-no-servidor.md) |
| Tempo real | Server-Sent Events: as telas abertas recarregam o dia que outra pessoa mudou | [0016](../adr/0016-porte-das-telas-e-tempo-real.md) |
| Testes | Vitest nos dois lados, Supertest na API com banco real, jsdom nas telas | [0005](../adr/0005-testes-com-vitest.md) |
| Empacotamento | Docker Compose: Caddy, Nginx, API, migração, PostgreSQL, Prometheus e Grafana | [0006](../adr/0006-hospedagem-na-aws-com-terraform.md) |
| Hospedagem | AWS EC2, infraestrutura em Terraform, deploy pelo Systems Manager, sem SSH | [0006](../adr/0006-hospedagem-na-aws-com-terraform.md), [0014](../adr/0014-regiao-maquina-e-https-do-deploy.md) |

## Diagramas C4

Os diagramas seguem o modelo C4 de Simon Brown ([c4model.com](https://c4model.com)), escritos em Mermaid, que o
GitHub desenha direto na página. Cada nível tem um documento com o diagrama, a legenda, os elementos, as relações, as
decisões e as premissas.

| Nível | Documento | Para quem |
|---|---|---|
| 1, contexto | [01-contexto.md](01-contexto.md) | Qualquer pessoa: quem usa e com quem o sistema fala |
| 2, contêineres | [02-conteineres.md](02-conteineres.md) | Equipe técnica: os sete contêineres e os protocolos |
| 3, componentes da API | [03-componentes-da-api.md](03-componentes-da-api.md) | Quem mexe no back-end |
| Apoio, implantação | [04-implantacao.md](04-implantacao.md) | Quem publica e opera o sistema na AWS |

O nível 4 (código) não foi desenhado. Para esse nível, o próprio código e os testes servem de referência.

## Organização do código

| Pasta | O que tem |
|---|---|
| `backend/src/<assunto>/` | Um controlador e um serviço por assunto: `importacao`, `operacao`, `escala`, `cadastros`, `autenticacao` |
| `backend/src/regras/` | Regras puras do setor, testadas sem banco |
| `backend/src/tempo-real/` | Canal de eventos para as telas |
| `backend/prisma/` | `schema.prisma` e as migrações versionadas |
| `frontend/src/PaginaInicial.tsx` | Tela de entrada em React |
| `frontend/src/sistema/telas/` | As seis telas trazidas, uma por arquivo |
| `frontend/src/sistema/servidor.js` | Tabela de rotas: cada função antiga do Apps Script aponta para uma rota da API |
| `infraestrutura/` | Terraform da AWS e o Compose de produção |
