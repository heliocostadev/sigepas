# Deploy

As decisões estão na [ADR 0006](../adr/0006-hospedagem-na-aws-com-terraform.md) (AWS, Terraform, Systems Manager e
OIDC) e na [ADR 0014](../adr/0014-regiao-maquina-e-https-do-deploy.md) (região `us-east-2`, máquina `t3.small` e
HTTPS pelo Caddy). **Situação em 27/11/2026:** os 12 recursos da AWS foram criados com `terraform apply` em 24/11/2026,
e o deploy automático está ligado desde então. Antes do primeiro `apply`, o Terraform, o Compose e o workflow passaram
por revisão de segurança. Toda mudança na infraestrutura passa primeiro por `terraform plan` e só é aplicada depois da
aprovação do autor do projeto.

## Como funciona

```text
internet ──HTTPS──> Caddy (80 e 443) ──> Nginx "web" (8080) ──/api/──> API (3000) ──> PostgreSQL (5432)
                                                                          └─ métricas (9464) <── Prometheus <── Grafana
```

1. **A infraestrutura está em Terraform**, em [`infraestrutura/terraform/`](../../infraestrutura/terraform/). Ele cria
   o grupo de segurança, só com as portas 80 e 443. Ele cria também a máquina EC2 com Amazon Linux 2023 e o IP fixo.
   Por fim, cria o papel da máquina para o Systems Manager e o acesso do GitHub Actions por OIDC.
2. **No primeiro boot**, o script `preparar-maquina.sh.tftpl` gera as senhas em `/opt/sigepas/.env`. Depois, ele
   instala o Docker, com rotação de logs, e o Docker Compose, numa versão conferida pelo checksum. Ele também cria
   2 GB de memória de troca e liga as atualizações de segurança automáticas.
3. **A cada merge na `main`**, o workflow [`deploy.yml`](../../.github/workflows/deploy.yml) gera as imagens. Ele as
   publica no GitHub Container Registry, com o SHA do commit como tag. Depois, faz login na AWS por OIDC e manda a
   máquina rodar o [`atualizar-sistema.sh`](../../infraestrutura/producao/atualizar-sistema.sh) pelo Systems Manager.
4. **O script na máquina** baixa a configuração do mesmo commit e atualiza os contêineres. Ele só termina com sucesso
   quando a API responde em `/saude`. Por fim, o workflow confere `https://<domínio>/api/saude`.

## O que roda na máquina

| Serviço | Porta | Quem acessa |
|---|---|---|
| `caddy` | 80 e 443 | A internet. Pede e renova o certificado do Let's Encrypt e repassa para o `web` |
| `web` (Nginx sem root) | 8080 | Só o Caddy, pela rede interna. Repassa `/api/` para a API |
| `api` | 3000 | Só o Nginx, pela rede interna |
| `api`, métricas | 9464 | Só o Prometheus, pela rede interna |
| `banco` | 5432 | Só a API, pela rede interna |
| `prometheus` e `grafana` | 9090 e 3001 | Só a própria máquina (127.0.0.1), pelo túnel do Systems Manager |

**IP do cliente e limite de requisições:** o Caddy informa o IP do cliente no `X-Forwarded-For`. O Nginx só aceita
esse cabeçalho quando ele vem do IP fixo do Caddy (`172.30.0.10`, regra `set_real_ip_from`). Depois, o Nginx repassa
o IP à API, que confia em um salto (`trust proxy` igual a 1). Se outro proxy for posto na frente do Caddy, essa
cadeia precisa ser revista.

## Antes de ligar o deploy

Estas regras do GitHub impedem que outra branch ou um push direto publique na produção. Elas vêm da revisão de
segurança de 24/11/2026.

1. **Ambiente `producao`:** em Settings > Environments, crie o ambiente `producao`. Em "Deployment branches", libere
   só a `main`. Crie o ambiente antes de ligar o deploy. Sem isso, o GitHub cria o ambiente sozinho, sem regra.
2. **Proteção da `main`:** crie uma regra que exige PR e a verificação "CI aprovado". A regra também bloqueia push
   forçado e exclusão da branch.
3. **Nenhum workflow com `pull_request_target`** pode usar o ambiente `producao`.

## Primeira publicação, passo a passo

No computador do autor, faça o login do AWS CLI:

```bash
aws login --profile sigepas --region us-east-2
```

1. Entre na pasta do Terraform:
   ```bash
   cd infraestrutura/terraform
   ```
2. Prepare a pasta:
   ```bash
   terraform init
   ```
3. Gere e confira o plano:
   ```bash
   terraform plan -out=plano.tfplan
   ```
4. Depois da aprovação do autor do projeto, aplique o plano:
   ```bash
   terraform apply plano.tfplan
   ```
5. Anote as três saídas: `ip_publico`, `id_da_maquina` e `papel_de_deploy`.
6. No DuckDNS, coloque o `ip_publico` no campo "current ip" do subdomínio.
7. Espere 5 minutos. A preparação do primeiro boot precisa terminar antes do primeiro deploy.
8. No GitHub, em Settings > Secrets and variables > Actions, aba "Variables", crie estas variáveis:

   | Variável | Valor |
   |---|---|
   | `DOMINIO` | O domínio, por exemplo `sigepas.duckdns.org` |
   | `AWS_ID_DA_MAQUINA` | A saída `id_da_maquina` |
   | `AWS_PAPEL_DE_DEPLOY` | A saída `papel_de_deploy` |
   | `DEPLOY_HABILITADO` | `true` |

9. Faça o merge da `dev` na `main` por um PR. O workflow `Deploy` roda sozinho.
10. Na primeira execução, a máquina não consegue baixar as imagens, porque o GitHub as cria como privadas. Em
    github.com/heliocostadev?tab=packages, abra `sigepas-api` e `sigepas-web`. Em "Package settings", troque a
    visibilidade para "Public". As imagens não têm segredo.
11. Na aba Actions, abra a execução do `Deploy` que falhou e clique em "Re-run all jobs".

## Operação

- **Voltar uma versão:** na aba Actions, abra a execução do `Deploy` da versão anterior e clique em "Re-run all
  jobs". O GitHub repete o deploy com o commit daquela execução. O GitHub só aceita repetir uma execução até 30 dias
  depois dela. Para uma volta definitiva, faça um `git revert` por PR.
- **Comandos do Systems Manager no computador do autor:** eles exigem o plugin do Session Manager instalado.
  ```bash
  winget install Amazon.SessionManagerPlugin
  ```
- **Ver os contêineres sem SSH:** abra uma sessão pelo Systems Manager.
  ```bash
  aws ssm start-session --profile sigepas --region us-east-2 --target <id_da_maquina>
  ```
  Na sessão, rode o comando do Compose:
  ```bash
  sudo docker compose -f /opt/sigepas/infraestrutura/producao/docker-compose.yml --env-file /opt/sigepas/.env ps
  ```
- **Abrir o Grafana:** crie um túnel até a porta 3001 da máquina e acesse `http://localhost:3001`. O usuário é
  `admin`. A senha está em `/opt/sigepas/.env` (`SENHA_DO_GRAFANA`), legível só pelo root.
  ```bash
  aws ssm start-session --profile sigepas --region us-east-2 --target <id_da_maquina> --document-name AWS-StartPortForwardingSession --parameters portNumber=3001,localPortNumber=3001
  ```
- **Não leia segredo pelo Run Command.** A saída do Run Command fica guardada na AWS. Para ler o `.env`, use a sessão
  do Session Manager.
- **Migrações do banco:** a cada deploy, o serviço `migracao` do Compose roda `prisma migrate deploy` com a imagem
  `sigepas-api:<sha>-migracao` e termina. A API só sobe depois que ele termina bem. Uma migração que falha deixa a
  versão anterior da API no ar, e o workflow `Deploy` reprova.
- **Gestor inicial (conta para entrar no site):** nenhuma senha fica no repositório. O script
  `SIGEPAS/criar-gestor-do-sigepas-no-ar.ps1` fica na pasta de trabalho do autor, fora do repositório. Ele gera a senha
  e calcula o hash scrypt no contêiner da API local. Depois, grava só o hash no segredo
  `HASH_DA_SENHA_DO_GESTOR_INICIAL` do GitHub, com o e-mail na variável `EMAIL_DO_GESTOR_INICIAL`. O deploy leva os dois
  para o `/opt/sigepas/.env`, e a API cria a conta na subida se ela ainda não existir. A senha fica em
  `ACESSO_AO_SIGEPAS_NO_AR.md`, fora do repositório.
- **Outras contas:** na máquina, pela sessão do Session Manager, rode o comando de criar conta dentro do contêiner da
  API. Sem `SENHA_DA_CONTA`, o comando gera uma senha forte e a mostra uma vez só.
  ```bash
  sudo docker compose -f /opt/sigepas/infraestrutura/producao/docker-compose.yml --env-file /opt/sigepas/.env exec api node backend/dist/comandos/criar-conta.js --email pessoa@exemplo.org --nome "Nome" --papel operador
  ```
- **Dados fictícios:** com `SEMEAR_DADOS_FICTICIOS=sim`, a API cadastra motoristas, carros e locais inventados quando o
  cadastro está vazio. O arquivo de pedidos fictício para importar está em `docs/exemplos/olostech-ficticio.csv` e na
  própria tela Importar CSV.
- **Trocar o domínio:** mude a variável `DOMINIO` no GitHub e aponte o DNS do domínio novo para o `ip_publico`.
  Depois, rode o workflow `Deploy`. O Caddy pede o certificado novo sozinho.
- **Desligar tudo:** só com a decisão do autor do projeto. Perto do Demo Day, a IA avisa com o custo acumulado, e o
  autor decide se mantém ou desliga. Para desligar, rode `terraform destroy` na pasta do Terraform. O volume do banco é
  apagado junto com a máquina.
- **Cópia do estado do Terraform:** depois de cada `apply` ou `destroy`, copie o `terraform.tfstate` para a pasta
  `ESTADO_DO_TERRAFORM`. Essa pasta fica no computador do autor, fora do repositório. Sem esse arquivo, o Terraform não
  reconhece os recursos.

## O que ainda falta

- **Cópia de segurança do banco** para o S3, com teste de restauração (ADR 0006). Entra antes do release.
- **Estado do Terraform num bucket S3.** Hoje, o arquivo `terraform.tfstate` fica só no computador do autor, fora do
  git. Se ele se perder, o Terraform não reconhece mais os recursos.
- **Monitor externo de disponibilidade**, com alerta quando `/api/saude` parar de responder.
- **Documento próprio do Systems Manager**, que aceite só um SHA da `main`, no lugar do `AWS-RunShellScript`.
