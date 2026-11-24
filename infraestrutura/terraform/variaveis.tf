variable "regiao" {
  description = "Região da AWS. A organização da conta só libera us-east-2 (ADR 0014)."
  type        = string
  default     = "us-east-2"
}

variable "perfil_do_aws_cli" {
  description = "Perfil do AWS CLI com o login temporário do Hélio."
  type        = string
  default     = "sigepas"
}

variable "tipo_da_maquina" {
  description = "Tipo da máquina EC2. A t3.small tem 2 GB de memória. O custo sai do crédito da conta (ADR 0014)."
  type        = string
  default     = "t3.small"
}

variable "tamanho_do_disco_em_gb" {
  description = "Tamanho do disco da máquina, em GB."
  type        = number
  default     = 20
}

# O repositório usa o identificador imutável no token OIDC: dono e repositório com os números internos do GitHub.
# Um repositório renomeado ou recriado com o mesmo nome não herda o acesso. Valor lido em 24/11/2026 com
# gh api repos/heliocostadev/sigepas/actions/oidc/customization/sub (campo sub_claim_prefix).
variable "identificador_do_repositorio_no_token_do_github" {
  description = "Início do campo sub do token OIDC do GitHub para o repositório sigepas."
  type        = string
  default     = "repo:heliocostadev@112868811/sigepas@1378826523"
}

variable "ambiente_de_deploy_no_github" {
  description = "Ambiente do GitHub Actions que pode assumir o papel de deploy."
  type        = string
  default     = "producao"
}
