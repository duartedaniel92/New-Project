#!/usr/bin/env bash
# Equivalente do iniciar.bat para Linux e macOS.
# Uso: ./iniciar.sh   (na primeira vez: chmod +x iniciar.sh)

set -euo pipefail
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "[ERRO] Node.js nao encontrado. Instale a versao 20 ou superior: https://nodejs.org"
  exit 1
fi

# o Vite 7 exige 20.19+ ou 22.12+; versoes 20.0 a 20.18 quebram no build
if ! node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit((a===20&&b>=19)||a>=21?0:1)'; then
  echo "[ERRO] Node.js $(node -v) encontrado, mas o projeto precisa da versao 20.19+ ou 22.12+."
  exit 1
fi

# workspaces do npm: um install na raiz cobre a API e a aplicacao
if [ ! -d node_modules ]; then
  echo "Instalando dependencias pela primeira vez. Isso pode demorar alguns minutos..."
  npm install
fi

echo "Iniciando API (3001) e aplicacao (5173). Encerre com Ctrl+C."
exec npm run dev
