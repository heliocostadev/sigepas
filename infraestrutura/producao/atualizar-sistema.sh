#!/bin/bash
# Atualiza o SIGEPAS na máquina de produção para a versão de um commit da main.
# Quem chama é o workflow de deploy, pelo AWS Systems Manager, como root. Não há SSH.
# Uso: atualizar-sistema.sh <sha-do-commit> <dominio>
set -euo pipefail

VERSAO="${1:-}"
DOMINIO="${2:-}"

# Os dois valores entram em arquivo e em comando, então só formatos esperados passam.
if [[ ! "$VERSAO" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Versão inválida: informe o SHA completo do commit." >&2
  exit 1
fi
if [[ ! "$DOMINIO" =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$ ]]; then
  echo "Domínio inválido." >&2
  exit 1
fi

PASTA=/opt/sigepas
ORIGEM="https://raw.githubusercontent.com/heliocostadev/sigepas/$VERSAO"
COMPOSE=(docker compose --project-directory "$PASTA/infraestrutura/producao" -f "$PASTA/infraestrutura/producao/docker-compose.yml" --env-file "$PASTA/.env")

cd "$PASTA"

# Uma atualização por vez. Se outra estiver rodando, esta para sem mexer em nada.
exec 9> "$PASTA/.trava-da-atualizacao"
if ! flock -n 9; then
  echo "Outra atualização está em andamento." >&2
  exit 1
fi

# Os arquivos de configuração vêm do mesmo commit das imagens, então a configuração e o código sempre combinam.
for arquivo in \
  infraestrutura/producao/docker-compose.yml \
  infraestrutura/producao/Caddyfile \
  observabilidade/prometheus.yml \
  observabilidade/grafana/provisionamento/fontes-de-dados/prometheus.yml; do
  install -d -m 755 "$(dirname "$arquivo")"
  # --proto =https: o download não aceita ser redirecionado para um endereço sem HTTPS.
  curl --proto '=https' -fsSL "$ORIGEM/$arquivo" -o "$arquivo"
done

# A versão e o domínio entram no .env sem tocar nas senhas.
sed -i '/^VERSAO=/d; /^DOMINIO=/d' .env
echo "VERSAO=$VERSAO" >> .env
echo "DOMINIO=$DOMINIO" >> .env

"${COMPOSE[@]}" pull
"${COMPOSE[@]}" up -d --remove-orphans

# A atualização só conta como feita quando a API responde e confirma o banco.
for tentativa in $(seq 1 30); do
  if "${COMPOSE[@]}" exec -T api wget -qO- http://127.0.0.1:3000/saude > /dev/null 2>&1; then
    echo "SIGEPAS atualizado para $VERSAO (tentativa $tentativa)."
    docker image prune -f > /dev/null
    exit 0
  fi
  sleep 5
done

echo "A API não respondeu em /saude depois da atualização." >&2
"${COMPOSE[@]}" ps >&2
exit 1
