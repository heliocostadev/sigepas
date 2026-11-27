# C4, diagrama de apoio: implantação na AWS

## Visão geral

Todos os contêineres rodam numa única máquina EC2 em `us-east-2` (Ohio), criada por Terraform. A máquina tem um IP fixo
e só abre as portas 80 e 443. O deploy não usa SSH. A cada merge na `main`, o GitHub Actions monta as imagens e
as publica no GitHub Container Registry. Depois, manda a máquina se atualizar pelo Systems Manager.

## Diagrama

```mermaid
C4Deployment
    title Diagrama de implantação do SIGEPAS em produção

    Deployment_Node(navegador, "Computador do setor", "Navegador") {
        Container(telas, "Telas no navegador", "React 19, JavaScript", "Interface dos três fluxos.")
    }

    Deployment_Node(github, "GitHub", "Serviço externo") {
        Container(actions, "Workflow Deploy", "GitHub Actions", "Monta as imagens e dispara a atualização.")
        Container(ghcr, "Registro de imagens", "GitHub Container Registry", "Guarda as imagens sigepas-api e sigepas-web por SHA do commit.")
    }

    Deployment_Node(aws, "AWS us-east-2", "Amazon Web Services") {
        Deployment_Node(ec2, "Máquina sigepas", "EC2 t3.small, Amazon Linux 2023, disco de 20 GB, IP fixo") {
            Deployment_Node(compose, "Docker Compose", "Rede interna 172.30.0.0/24") {
                Container(caddy, "Proxy de entrada", "Caddy 2.11", "Portas 80 e 443.")
                Container(web, "Servidor das telas", "Nginx 1.29", "Porta interna 8080.")
                Container(api, "API", "Node 24, NestJS 12", "Porta interna 3000 e métricas na 9464.")
                ContainerDb(banco, "Banco de dados", "PostgreSQL 16", "Volume persistente.")
                Container(prometheus, "Coletor de métricas", "Prometheus 3.7", "127.0.0.1:9090.")
                Container(migracao, "Migração do banco", "Prisma 7", "Roda a cada atualização e termina.")
                Container(grafana, "Consulta de métricas", "Grafana 12.3", "127.0.0.1:3001.")
            }
        }
        Container(ssm, "Systems Manager", "AWS SSM", "Executa o script de atualização na máquina.")
    }

    Rel(telas, caddy, "Abre o sistema por", "HTTPS 443")
    Rel(caddy, web, "Repassa para", "HTTP 8080")
    Rel(web, api, "Repassa /api/ para", "HTTP 3000")
    Rel(api, banco, "Lê e grava em", "SQL 5432")
    Rel(migracao, banco, "Aplica as migrações em", "SQL 5432")
    Rel(prometheus, api, "Lê as métricas de", "HTTP 9464")
    Rel(grafana, prometheus, "Consulta", "PromQL 9090")
    Rel(actions, ghcr, "Publica as imagens em", "HTTPS")
    Rel(actions, ssm, "Manda rodar atualizar-sistema.sh por", "OIDC e API da AWS")
    Rel(ssm, compose, "Baixa as imagens novas e reinicia", "docker compose up")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="2")
```

## Legenda

| Forma | Significado |
|---|---|
| Moldura | Nó de implantação: máquina, serviço ou ambiente |
| Caixa azul | Contêiner do SIGEPAS ou serviço que participa do deploy |
| Cilindro | Banco de dados |
| Seta | Uma direção, com a intenção, o protocolo e a porta |

Siglas: EC2 (máquina virtual da AWS), SSM (Systems Manager), OIDC (credencial de curta duração entre o GitHub e a AWS),
SHA (identificador do commit).

## Elementos

| Nome | Tipo | Tecnologia | Responsabilidade |
|---|---|---|---|
| Máquina sigepas | Nó | EC2 `t3.small`, 20 GB | Roda todos os contêineres |
| Docker Compose | Nó | Docker | Sobe os sete contêineres numa rede interna |
| Systems Manager | Serviço AWS | AWS SSM | Recebe o comando de atualização sem SSH |
| Workflow Deploy | Serviço externo | GitHub Actions | Monta as imagens e dispara o deploy |
| Registro de imagens | Serviço externo | GHCR | Guarda as imagens versionadas pelo SHA |

## Relações principais

| De | Para | Intenção | Protocolo e porta |
|---|---|---|---|
| Navegador | Caddy | Abre o sistema | HTTPS 443 (a porta 80 só redireciona) |
| Workflow Deploy | GHCR | Publica as imagens | HTTPS |
| Workflow Deploy | Systems Manager | Manda rodar `atualizar-sistema.sh` | OIDC e API da AWS |
| Systems Manager | Docker Compose | Baixa as imagens novas e reinicia | `docker compose up` |

## Decisões que aparecem neste nível

- **Uma máquina só.** O volume de uso do setor cabe numa `t3.small`. O custo fica no crédito da AWS
  ([ADR 0006](../adr/0006-hospedagem-na-aws-com-terraform.md) e [ADR 0014](../adr/0014-regiao-maquina-e-https-do-deploy.md)).
- **Versão pelo SHA do commit.** Cada imagem leva o SHA do commit. Voltar uma versão é repetir a execução do Deploy
  da versão anterior, que leva o SHA daquele commit ([instruções de deploy](../deploy/README.md)).
- **Portas mínimas.** O grupo de segurança abre só 80 e 443. O PostgreSQL, o Prometheus e o Grafana não saem da
  máquina.

## Premissas

- A cópia de segurança do banco para o S3 ainda não existe. O volume do PostgreSQL fica só no disco da máquina.

## Outros níveis

- Nível 1: [contexto](01-contexto.md)
- Nível 2: [contêineres](02-conteineres.md)
- Nível 3: [componentes da API](03-componentes-da-api.md)
