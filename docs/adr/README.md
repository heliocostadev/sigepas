# Decisões de arquitetura (ADR)

Uma decisão por arquivo, no modelo [`0000-modelo.md`](0000-modelo.md). ADR não se edita depois de aceita: a correção
é uma ADR nova ([ADR 0001](0001-registrar-decisoes-em-adr.md)).

| ADR | Decisão | Situação |
|---|---|---|
| [0001](0001-registrar-decisoes-em-adr.md) | Registrar as decisões de arquitetura em ADRs | Aceita em 08/11/2026 |
| [0002](0002-back-end-em-nestjs.md) | Back-end em NestJS | Aceita em 08/11/2026. Substituída em parte pela [0020](0020-o-que-as-adrs-aceitas-previam-e-ainda-nao-esta-no-ar.md) |
| [0003](0003-postgresql-com-prisma.md) | PostgreSQL com Prisma | Aceita em 08/11/2026. Substituída em parte pela [0020](0020-o-que-as-adrs-aceitas-previam-e-ainda-nao-esta-no-ar.md) |
| [0004](0004-front-end-em-react-com-vite.md) | Front-end em React com Vite | Aceita em 08/11/2026. Substituída em parte pela [0020](0020-o-que-as-adrs-aceitas-previam-e-ainda-nao-esta-no-ar.md) |
| [0005](0005-testes-com-vitest.md) | Testes com Vitest nos dois lados | Aceita em 16/11/2026. Substituída em parte pela [0020](0020-o-que-as-adrs-aceitas-previam-e-ainda-nao-esta-no-ar.md) |
| [0006](0006-hospedagem-na-aws-com-terraform.md) | Hospedagem na AWS EC2, com Terraform e deploy sem SSH | Aceita em 08/11/2026. Substituída em parte pela [0020](0020-o-que-as-adrs-aceitas-previam-e-ainda-nao-esta-no-ar.md) |
| [0007](0007-dois-papeis-gestor-e-operador.md) | Dois papéis: gestor e operador | Aceita em 08/11/2026. Substituída em parte pela [0019](0019-toda-a-logistica-e-de-quem-trabalha-no-setor.md) |
| [0008](0008-tres-fluxos-de-negocio.md) | Três fluxos de negócio | Aceita em 08/11/2026. Substituída em parte pela [0018](0018-terceiro-fluxo-e-a-confirmacao-do-paciente.md) e pela [0020](0020-o-que-as-adrs-aceitas-previam-e-ainda-nao-esta-no-ar.md) |
| [0009](0009-retorno-segue-a-ida.md) | O retorno não é gerenciado: a volta segue a ida | Aceita em 08/11/2026. Substituída em parte pela [0020](0020-o-que-as-adrs-aceitas-previam-e-ainda-nao-esta-no-ar.md) |
| [0010](0010-chave-natural-do-pedido.md) | Identidade do pedido por chave natural de oito colunas | Aceita em 08/11/2026 |
| [0011](0011-dicionario-inicial-de-locais.md) | Dicionário inicial de locais vindo do sistema atual | Aceita em 08/11/2026. Substituída em parte pela [0020](0020-o-que-as-adrs-aceitas-previam-e-ainda-nao-esta-no-ar.md) |
| [0012](0012-metodo-de-trabalho-com-ia.md) | Método de trabalho com IA: Maestro enxuto | Aceita em 08/11/2026 |
| [0013](0013-estrutura-e-versoes-do-esqueleto.md) | Estrutura do repositório e versões do esqueleto | Proposta em 16/11/2026, aguarda aprovação |
| [0014](0014-regiao-maquina-e-https-do-deploy.md) | Deploy em us-east-2, numa t3.small, com HTTPS pelo Caddy | Aceita em 24/11/2026 |
| [0015](0015-login-e-sessao-no-servidor.md) | Login com sessão no servidor, senha com scrypt e dois papéis | Proposta em 26/11/2026, aguarda revisão |
| [0016](0016-porte-das-telas-e-tempo-real.md) | Porte do SIGEPAS em Apps Script, telas com a mesma aparência e tempo real por SSE | Proposta em 26/11/2026, aguarda revisão |
| [0018](0018-terceiro-fluxo-e-a-confirmacao-do-paciente.md) | O terceiro fluxo é a confirmação do paciente, e a remoção interna fica fora da entrega | Proposta em 27/11/2026, aguarda revisão |
| [0019](0019-toda-a-logistica-e-de-quem-trabalha-no-setor.md) | Toda a logística é de quem trabalha no setor, e só o gestor altera cadastros e configurações | Proposta em 27/11/2026, aguarda revisão |
| [0020](0020-o-que-as-adrs-aceitas-previam-e-ainda-nao-esta-no-ar.md) | O que as ADRs aceitas previam e ainda não está no ar | Proposta em 27/11/2026, aguarda revisão |

As ADRs de 0001 a 0012 registram decisões tomadas em 08/11/2026, exceto a 0005, decidida em 16/11/2026
depois de uma prova de conceito. A IA propôs a redação de todas, e essa redação aguarda revisão.

As ADRs 0018 a 0020 corrigem os trechos das ADRs aceitas que não batem com o sistema no ar em 27/11/2026. As ADRs
afetadas não foram reescritas. Cada uma ganhou só a linha "Substituída em parte", como pede o [modelo](0000-modelo.md).
