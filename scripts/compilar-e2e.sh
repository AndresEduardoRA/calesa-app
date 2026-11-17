#!/usr/bin/env bash
# Compila la app para el e2e (`.next-e2e`, lo que sirve `E2E_PROD=1`): el primer paso de `pnpm test:e2e`.
#
#   bash scripts/compilar-e2e.sh
#
# Next corta el build con `SecurityFatalError` la primera vez que lo corre una sesión de IA (un aviso de versión con una vulnerabilidad
# conocida, que pide repetir el comando) y la segunda pasa. Aquí se repite una vez sólo por eso, con el aviso a la vista; cualquier otro
# fallo sale tal cual. Actualizar Next es de la persona (`docs/PENDIENTES.md`). Lo mismo hace `scripts/despliegue/en-seco.sh`.
set -uo pipefail
salida=$(mktemp)
trap 'rm -f "$salida"' EXIT
NEXT_DIST_DIR=.next-e2e next build 2>&1 | tee "$salida"
codigo=${PIPESTATUS[0]}
if [ "$codigo" != 0 ] && grep -q 'SecurityFatalError' "$salida"; then
  echo "· next build se cortó por su aviso de seguridad (SecurityFatalError): lo repito una vez." >&2
  NEXT_DIST_DIR=.next-e2e next build
  codigo=$?
fi
exit "$codigo"
