# Valores que o Hélio copia para o DuckDNS e para as variáveis do repositório no GitHub depois do terraform apply.
output "ip_publico" {
  description = "IP fixo da máquina. Vai no campo current ip do DuckDNS."
  value       = aws_eip.sigepas.public_ip
}

output "id_da_maquina" {
  description = "Vai na variável AWS_ID_DA_MAQUINA do repositório."
  value       = aws_instance.sigepas.id
}

output "papel_de_deploy" {
  description = "Vai na variável AWS_PAPEL_DE_DEPLOY do repositório."
  value       = aws_iam_role.deploy_pelo_github.arn
}
