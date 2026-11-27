# 0006. Hospedagem na AWS EC2, com Terraform e deploy sem SSH

- **Situação:** aceita em 08/11/2026.
- **Redação:** proposta pela IA em 08/11/2026, a partir do registro de trabalho e dos planos da pasta TCC.
  O texto passa por revisão e ajuste de redação.
- **Fontes:** registro de trabalho de 08/11/2026, plano de construção (seção 2) e quadro do ambiente de IA
  (seção 8.4).

## Contexto

A linha exige deploy público e proíbe Vercel, Netlify, Firebase, Render e deploy manual por SSH. O projeto não tinha
conta na AWS em 08/11/2026.

## Decisão

- **AWS, máquina EC2 pequena** com Linux e Docker, IP elástico e HTTPS por Let's Encrypt.
- **Infraestrutura em Terraform**, no repositório, desde o esqueleto (item de diferencial do playbook).
- **Docker Compose** com API, front-end, PostgreSQL, Prometheus e Grafana. As imagens ficam no GitHub Container
  Registry, com a tag do commit.
- **Deploy pelo AWS Systems Manager (Run Command)**, com acesso do GitHub por OIDC, sem chave guardada e sem SSH.
- **Voltar versão** é reimplantar a tag anterior.

## Alternativas consideradas

- **Plataformas que publicam sozinhas:** a linha proíbe as plataformas citadas acima.
- **Deploy por SSH a partir do GitHub Actions:** a permissão depende de como se interpreta a proibição. O Systems
  Manager evita a dúvida. A pergunta vai para o professor na orientação de 12/11/2026.
- **Terraform só depois do release:** esta alternativa foi descartada em 08/11/2026, pela regra da caixa de
  ferramentas completa.

## Consequências

- A conta na AWS precisa ser criada, com alerta de orçamento, antes do deploy.
- O sistema faz cópia de segurança diária do PostgreSQL para o S3, com teste de restauração.
- O `terraform apply` só roda com autorização prévia.
