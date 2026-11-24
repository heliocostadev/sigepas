# Amazon Linux 2023, a imagem mais recente publicada pela AWS. O agente do Systems Manager já vem instalado nela.
data "aws_ssm_parameter" "amazon_linux_2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

# Papel da máquina: só o necessário para o Systems Manager funcionar (receber comandos e abrir sessão sem SSH).
data "aws_iam_policy_document" "maquina_assume_papel" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "maquina" {
  name               = "sigepas-maquina"
  description        = "Papel da maquina do SIGEPAS: so o Systems Manager"
  assume_role_policy = data.aws_iam_policy_document.maquina_assume_papel.json
}

resource "aws_iam_role_policy_attachment" "maquina_systems_manager" {
  role       = aws_iam_role.maquina.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "maquina" {
  name = "sigepas-maquina"
  role = aws_iam_role.maquina.name
}

resource "aws_instance" "sigepas" {
  ami                    = data.aws_ssm_parameter.amazon_linux_2023.value
  instance_type          = var.tipo_da_maquina
  subnet_id              = data.aws_subnet.sub_rede_publica.id
  vpc_security_group_ids = [aws_security_group.sigepas_web.id]
  iam_instance_profile   = aws_iam_instance_profile.maquina.name

  # Sem IP público temporário. O único endereço público da máquina é o IP fixo (aws_eip.sigepas), associado logo
  # depois da criação. O script do primeiro boot espera esse IP antes de baixar pacotes.
  associate_public_ip_address = false

  # A preparação roda uma vez, no primeiro boot: Docker, Docker Compose, memória de troca e as senhas geradas na
  # própria máquina. Nenhuma senha passa pelo Terraform nem fica no estado dele.
  user_data = templatefile("${path.module}/preparar-maquina.sh.tftpl", {
    versao_do_docker_compose   = "v5.7.1"
    checksum_do_docker_compose = "af426722a8af5de812fcee30cc1c39f0639f5f723cbadefb25e5d4db054064cf"
  })

  # Exige o IMDSv2, que protege as credenciais da máquina contra ataques de falsificação de requisição (SSRF).
  metadata_options {
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
    http_endpoint               = "enabled"
  }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.tamanho_do_disco_em_gb
    encrypted             = true
    delete_on_termination = true
  }

  # Uma imagem nova do Amazon Linux não deve recriar a máquina sozinha. A troca de imagem é uma decisão do Hélio.
  lifecycle {
    ignore_changes = [ami, user_data]
  }

  tags = {
    Name = "sigepas"
  }
}

# IP fixo: o endereço não muda quando a máquina reinicia, e o domínio aponta sempre para ele.
resource "aws_eip" "sigepas" {
  domain   = "vpc"
  instance = aws_instance.sigepas.id

  tags = {
    Name = "sigepas"
  }
}
