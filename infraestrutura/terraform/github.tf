# Login do GitHub Actions na AWS por OIDC: o GitHub entrega um token de curta duração a cada execução, e a AWS o troca
# por credenciais temporárias. Não existe chave de acesso guardada no GitHub (ADR 0006).
resource "aws_iam_openid_connect_provider" "github_actions" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

# Só o ambiente "producao" deste repositório pode assumir o papel. Outro repositório não pode. Outra branch e PR só
# ficam de fora porque o ambiente "producao" do GitHub libera apenas a main (Settings > Environments, docs/deploy).
data "aws_iam_policy_document" "deploy_assume_papel" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github_actions.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["${var.identificador_do_repositorio_no_token_do_github}:environment:${var.ambiente_de_deploy_no_github}"]
    }
  }
}

resource "aws_iam_role" "deploy_pelo_github" {
  name                 = "sigepas-deploy-pelo-github"
  description          = "GitHub Actions do sigepas: manda a maquina atualizar pelo Systems Manager"
  assume_role_policy   = data.aws_iam_policy_document.deploy_assume_papel.json
  max_session_duration = 3600
}

# O papel só consegue mandar um script para esta máquina e ler o resultado. Ele não cria nem apaga recursos.
data "aws_iam_policy_document" "deploy_permissoes" {
  statement {
    sid     = "MandarComandoSoParaAMaquinaDoSigepas"
    actions = ["ssm:SendCommand"]
    resources = [
      aws_instance.sigepas.arn,
      "arn:aws:ssm:${var.regiao}::document/AWS-RunShellScript",
    ]
  }

  statement {
    sid       = "LerOResultadoDoComando"
    actions   = ["ssm:GetCommandInvocation", "ssm:ListCommandInvocations"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "deploy_pelo_github" {
  name   = "mandar-a-maquina-atualizar"
  role   = aws_iam_role.deploy_pelo_github.id
  policy = data.aws_iam_policy_document.deploy_permissoes.json
}
