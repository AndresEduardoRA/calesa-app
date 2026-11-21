#!/usr/bin/env bash
# Corre un comando como la app del orquestador (README.md › «Como la app de GitHub»): `gh …`, `git …` o `bash scripts/flujo/<guion>.sh …`
# con el token de la app, el envoltorio gh-app/gh y el helper de git (app.sh › entrar_como_app). Pisa el GH_TOKEN que se haya heredado.
# Lo usan la persona a mano, el «A mano:» del kit en modo app y las sesiones que publican como la app. Nada más pasa (64): no es una
# puerta para ver el token (`gh auth …`, `git credential …`).
#
#   bash scripts/orquestador/como-app.sh gh api installation/repositories --jq '.repositories[].full_name'
#   bash scripts/orquestador/como-app.sh bash scripts/flujo/publicar.sh --sin-esperar --titulo '…' --cuerpo cuerpo.md
set -uo pipefail
ORQ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(dirname "$(git -C "$ORQ" rev-parse --path-format=absolute --git-common-dir)")"
# shellcheck source=config.env
source "$ORQ/config.env"
# shellcheck disable=SC1091
[ -f "${ORQ_DATOS:-$REPO/.orquestador}/config.local.env" ] && source "${ORQ_DATOS:-$REPO/.orquestador}/config.local.env"
# shellcheck source=app.sh
source "$ORQ/app.sh"

rechazar() {
  echo "como-app.sh sólo corre gh …, git … o bash scripts/flujo/<guion>.sh … (y nunca gh auth ni git credential): $*" >&2
  exit 64
}
case "${1:-} ${2:-}" in
  "gh "* | "git "*)
    # Las opciones globales van antes del subcomando (`gh -R x auth token`): se mira cada palabra.
    for a in "${@:2}"; do
      case "$1 $a" in "gh auth" | "git credential") rechazar "$@" ;; esac
    done
    ;;
  "bash "*) [[ "${2:-}" =~ ^(\./)?scripts/flujo/[a-z0-9-]+\.sh$ ]] || rechazar "$@" ;;
  *) rechazar "$@" ;;
esac
app_configurada || { echo "La app no está configurada: APP_ID y APP_INSTALACION en scripts/orquestador/config.env." >&2; exit 1; }
entrar_como_app || { echo "No puedo actuar como la app: $APP_MOTIVO" >&2; exit 1; }
exec "$@"
