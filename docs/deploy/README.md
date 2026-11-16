# Deploy

A decisão está na [ADR 0006](../adr/0006-hospedagem-na-aws-com-terraform.md). **Situação em 08/11/2026: o Terraform
ainda não foi escrito e nada foi criado na AWS.** A conta ainda não existe. O Terraform é escrito junto com o esqueleto
(plano de construção: 09/11 e 10/11/2026). Ele só é aplicado depois que a conta existir, com o ok do Hélio.

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
6. O **alerta de orçamento** fica ligado na AWS desde o primeiro acesso, porque a conta é com cartão.

## O que o Hélio precisa fazer antes

- Criar a conta na AWS e configurar o alerta de orçamento.
- Depois disso, o `revisor-de-seguranca` revisa o Terraform já escrito. O Terraform só é aplicado com o ok do Hélio
  (`terraform apply` pede confirmação no `.claude/settings.json`).

Esta página ganha os passos exatos de deploy e de volta de versão no mesmo PR em que o deploy existir.
