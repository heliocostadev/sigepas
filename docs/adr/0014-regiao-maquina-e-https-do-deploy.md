# 0014. Deploy em us-east-2, numa t3.small, com HTTPS pelo Caddy

- **Situação:** aceita em 24/11/2026.
- **Redação:** IA, em 24/11/2026, durante a escrita do Terraform.
- **Fontes:** decisões da conversa de 24/11/2026 e consulta à conta da AWS no mesmo dia. Foram escolhidos a
  máquina `t3.small`, o subdomínio gratuito no começo e o domínio próprio depois. Também a ADR 0006.

## Contexto

A ADR 0006 decidiu o deploy numa máquina EC2 pequena, com Terraform, HTTPS e Systems Manager. Ela não fixou a região,
o tamanho da máquina nem o programa do HTTPS.

Em 24/11/2026, a consulta `ec2:DescribeInstanceTypes` em `sa-east-1` (São Paulo) foi negada. A negação veio de uma
política de controle de serviço (SCP) da organização da AWS da qual a conta faz parte. A mesma consulta funcionou em
`us-east-2` (Ohio). O login do AWS CLI também só é aceito em `us-east-2`. A política não é controlada pelo autor do
projeto.

O plano gratuito cobre, em `us-east-2`, máquinas de 1 GB e de 2 GB das famílias `t3`, `t4g`, `t8i` e `t9g`. Ele cobre
também a `c7i-flex.large`, de 4 GB, e a `m7i-flex.large`, de 8 GB. O crédito da conta é de 100 dólares, até
16/05/2027.

O sistema roda seis contêineres: banco, API, Nginx, Caddy, Prometheus e Grafana.

## Decisão

- **Região `us-east-2` (Ohio)**, a única liberada pela organização da conta.
- **Máquina `t3.small`**, com 2 GB de memória, 2 GB de memória de troca e disco de 20 GB criptografado. Ela usa
  processador x86, o mesmo das imagens geradas pelo CI.
- **HTTPS pelo Caddy**, num contêiner na frente do Nginx. O Caddy pede e renova o certificado do Let's Encrypt
  sozinho. O Nginx confia no IP real do cliente só quando ele vem do IP fixo do Caddy na rede interna
  (`set_real_ip_from`). Assim, a API continua confiando em um salto de proxy (`trust proxy` igual a 1).
- **Domínio:** `sigepas.duckdns.org`, gratuito, até o domínio próprio ficar pronto. A troca de domínio é só
  uma variável do repositório (`DOMINIO`) e o registro no DNS.
- **Senhas geradas na própria máquina**, no primeiro boot, em `/opt/sigepas/.env`, legível só pelo root. Elas não
  passam pelo Terraform, pelo GitHub nem pela conversa.
- **Login do GitHub na AWS pelo identificador imutável do repositório.** O campo `sub` do token traz o dono e o
  repositório com os números internos do GitHub. Um repositório renomeado ou recriado com o mesmo nome não herda o
  acesso. O valor foi lido com `gh api repos/heliocostadev/sigepas/actions/oidc/customization/sub`.

## Alternativas consideradas

- **`sa-east-1` (São Paulo):** era a preferência, pela distância e pela LGPD. A organização da conta bloqueia a
  região. O sistema só usa dados fictícios, então nenhum dado pessoal real sai do Brasil. Se um dia houver dado real,
  a transferência internacional (LGPD, art. 33) volta a ser avaliada.
- **`t3.micro` (1 GB):** custa cerca de metade, mas fica apertada para seis contêineres.
- **`c7i-flex.large` (4 GB):** sobra memória, mas o custo estimado de cerca de 62 dólares por mês consome mais da
  metade do crédito em um mês.
- **`t4g.small` (ARM):** custa um pouco menos, mas exige imagens Docker para ARM, que o CI ainda não gera.
- **HTTPS no próprio Nginx, com certbot:** exige um processo a mais para renovar o certificado e recarregar o Nginx.
  O Caddy faz as duas coisas sozinho.
- **`trust proxy` igual a 2 na API:** funciona, mas faz a API depender de quantos proxies existem na frente dela. Com
  o `set_real_ip_from` no Nginx, a API não muda entre a máquina de desenvolvimento e a produção.

## Consequências

- O custo estimado é de cerca de 20 dólares por mês (máquina, disco e IP fixo), descontados do crédito. O orçamento
  "My Zero-Spend Budget" pode mandar alerta quando o crédito começar a ser usado.
- O estado do Terraform fica no computador do autor, fora do git. Se o arquivo se perder, o Terraform não reconhece mais
  os recursos. Guardar o estado num bucket S3 fica como melhoria.
- Antes do primeiro deploy, o autor do projeto cria no GitHub o ambiente `producao`, só para a `main`, e a proteção da
  `main`. Ele cria também as variáveis `DEPLOY_HABILITADO`, `DOMINIO`, `AWS_ID_DA_MAQUINA` e `AWS_PAPEL_DE_DEPLOY`.
  Depois do primeiro deploy, ele torna públicas as duas imagens do GitHub Container Registry, para a máquina baixá-las
  sem senha.
- O desligamento não é automático. Perto do Demo Day e quando o crédito ficar baixo, a IA avisa o autor do
  projeto com o custo acumulado. O autor decide se mantém o sistema no ar ou se roda `terraform destroy` (pedido de
  24/11/2026).
