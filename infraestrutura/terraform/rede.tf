# A máquina usa a rede padrão da conta em us-east-2, que já tem sub-redes públicas.
data "aws_vpc" "rede_padrao" {
  default = true
}

data "aws_subnet" "sub_rede_publica" {
  vpc_id            = data.aws_vpc.rede_padrao.id
  availability_zone = "${var.regiao}a"
  default_for_az    = true
}

# Só entram as portas 80 (HTTP, que o Caddy redireciona para HTTPS) e 443 (HTTPS). Não há porta 22: o acesso à máquina
# é pelo AWS Systems Manager, sem SSH (ADR 0006).
resource "aws_security_group" "sigepas_web" {
  name        = "sigepas-web"
  description = "SIGEPAS: entrada so por HTTP e HTTPS"
  vpc_id      = data.aws_vpc.rede_padrao.id
}

resource "aws_vpc_security_group_ingress_rule" "http_ipv4" {
  security_group_id = aws_security_group.sigepas_web.id
  description       = "HTTP, redirecionado para HTTPS"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_ingress_rule" "https_ipv4" {
  security_group_id = aws_security_group.sigepas_web.id
  description       = "HTTPS"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  cidr_ipv4         = "0.0.0.0/0"
}

# A saída fica liberada: a máquina baixa as imagens do GitHub, os pacotes do sistema e o certificado do Let's Encrypt,
# e o agente do Systems Manager fala com a AWS.
resource "aws_vpc_security_group_egress_rule" "saida_ipv4" {
  security_group_id = aws_security_group.sigepas_web.id
  description       = "Saida para a internet"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}
