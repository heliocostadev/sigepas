# Deploy

A decisão está na [ADR 0006](../adr/0006-hospedagem-na-aws-com-terraform.md). **Situação em 17/11/2026: a conta na
AWS existe desde 16/11, no plano gratuito, com orçamento de gasto zero. O Terraform ainda não foi escrito, e nada foi
criado na AWS.** O Terraform é escrito depois do merge do esqueleto. Ele só é aplicado com o ok do Hélio.

## O que roda na máquina

O `docker-compose.yml` da máquina de desenvolvimento serve de base para a produção. Na produção, só a porta das telas
fica publicada. A API, as métricas, o banco, o Prometheus e o Grafana não publicam porta nenhuma, e nenhuma senha tem
valor padrão.

| Serviço | Porta | Quem acessa |
|---|---|---|
| `web` (Nginx sem root) | 8080 | A internet, pelo HTTPS. Repassa `/api/` para a API |
| `api` | 3000 | Só o Nginx, pela rede interna |
| `api`, métricas | 9464 | Só o Prometheus, pela rede interna. O Nginx não repassa esta porta |
| `banco` | 5432 | Só a API, pela rede interna |
| `prometheus` e `grafana` | 9090 e 3000 | Só pela rede interna ou por túnel. Nenhum dos dois fica público |

**Condição para o limite de requisições:** nenhum outro proxy fica na frente do contêiner `web`. Se o HTTPS terminar
num proxy à frente dele, esse proxy deve sobrescrever o `X-Forwarded-For`. Nesse caso, a API passa a confiar em dois
saltos (`trust proxy` igual a 2). Sem isso, todos os clientes voltam a dividir o mesmo limite.

As variáveis ficam fora do repositório, na máquina da AWS. Os nomes
estão em [`docs/app/README.md`](../app/README.md).

## Como vai funcionar

1. **A infraestrutura é escrita em Terraform** e fica no repositório. O Terraform cria a rede, uma máquina EC2
   pequena com Linux e Docker e o IP elástico. Também cria as permissões do Systems Manager e o acesso do GitHub
   Actions por OIDC (login federado, sem chave guardada).
2. **A cada merge na `main`**, o GitHub Actions gera as imagens Docker. Ele publica as imagens no GitHub Container
   Registry com a tag do commit. Depois, manda a máquina atualizar pelo **AWS Systems Manager (Run Command)**. Não há
   SSH no deploy, o que atende à proibição de deploy manual por SSH.
3. O site usa **HTTPS** com certificado Let's Encrypt.
4. **Voltar uma versão:** reimplante a imagem com a tag do commit anterior.
5. A **cópia de segurança** do PostgreSQL vai para o S3 todos os dias, com teste de restauração.
6. O **alerta de orçamento** fica ligado na AWS desde o primeiro acesso.

## O que o Hélio precisa fazer antes

- A conta na AWS e o alerta de orçamento já existem (16/11/2026).
- Quando o Terraform estiver escrito, o `revisor-de-seguranca` faz a revisão dele. O Terraform só é aplicado com o
  ok do Hélio (`terraform apply` pede confirmação no `.claude/settings.json`).

Esta página ganha os passos exatos de deploy e de volta de versão no mesmo PR em que o deploy existir.
