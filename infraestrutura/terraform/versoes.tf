# Versões do Terraform e do plugin da AWS. O arquivo .terraform.lock.hcl fixa a versão exata e o hash do plugin.
terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.73.0"
    }
  }
}

# As credenciais vêm do perfil do AWS CLI (aws login --profile sigepas). Nenhuma chave fica no repositório.
provider "aws" {
  region  = var.regiao
  profile = var.perfil_do_aws_cli

  default_tags {
    tags = {
      Projeto     = "SIGEPAS"
      Ambiente    = "producao"
      Gerenciado  = "terraform"
      Repositorio = "github.com/heliocostadev/sigepas"
    }
  }
}
