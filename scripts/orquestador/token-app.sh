#!/usr/bin/env bash
# El token de instalación de la app del orquestador (README.md › «Como la app de GitHub»): firma un JWT RS256 con la clave de la app
# (openssl), lo cambia por un token de una hora (POST /app/installations/<id>/access_tokens) y lo guarda en caché hasta APP_RENOVAR_S
# antes de que venza. Sin dependencias: openssl, curl, jq y flock. Lo usan el bucle (app.sh), el envoltorio gh-app/gh y git (helper).
#
#   token-app.sh                     el token, sólo eso, por stdout
#   token-app.sh credencial <get|store|erase>   helper de credenciales de git (sólo https://github.com)
#   token-app.sh --bot | --permisos | --vence   el login de la app, sus permisos (JSON) o el vencimiento (epoch), de la caché
#
# La clave va por ruta (APP_CLAVE), nunca su contenido en una variable ni en argv; el JWT va a curl por stdin (`--config -`). Nada
# secreto sale por stderr. Lee APP_ID, APP_INSTALACION y APP_CLAVE del entorno; si APP_ID no está definido, del config.env de esta
# carpeta y del config.local.env de la principal. APP_API sólo cambia en las pruebas.
#
# Salida: 0 bien · 1 sin red · 3 la app no está configurada (sin mensaje) · 4 la clave no se lee · 5 el reloj de la máquina está corrido
# · 6 GitHub no dio el token.
set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -z "${APP_ID+x}" ]; then
  # shellcheck source=config.env
  source "$DIR/config.env"
  principal="$(dirname "$(git -C "$DIR" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)")"
  # shellcheck disable=SC1091
  [ -f "${ORQ_DATOS:-$principal/.orquestador}/config.local.env" ] && source "${ORQ_DATOS:-$principal/.orquestador}/config.local.env"
fi
APP_API="${APP_API:-https://api.github.com}"
RENOVAR_S="${APP_RENOVAR_S:-300}"

configurada() { [ -n "${APP_ID:-}" ] && [ -n "${APP_INSTALACION:-}" ] && [ "${ORQ_SIN_APP:-0}" != 1 ]; }

CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/orquestador"
CACHE="$CACHE_DIR/app-${APP_INSTALACION:-}"

# La caché: cuatro líneas (vence en epoch, el token, el login de la app y los permisos en JSON compacto). VENCE vacío si no hay.
VENCE="" TOKEN="" BOT="" PERMISOS=""
leer_cache() {
  VENCE="" TOKEN="" BOT="" PERMISOS=""
  [ -r "$CACHE" ] || return 1
  { read -r VENCE; read -r TOKEN; read -r BOT; read -r PERMISOS; } <"$CACHE"
  [[ "$VENCE" =~ ^[0-9]+$ ]] && [ -n "$TOKEN" ]
}
cache_fresca() { leer_cache && [ $((VENCE - $(date +%s))) -gt "$RENOVAR_S" ]; }

b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }

clave_legible() { # 0 si APP_CLAVE es una clave RSA que se lee; si no, el motivo por stderr
  local ruta=${APP_CLAVE:-}
  if [ -z "$ruta" ]; then
    echo "No puedo leer la clave de la app en (vacío): APP_CLAVE no está definida en config.env." >&2
  elif [ ! -e "$ruta" ]; then
    echo "No puedo leer la clave de la app en $ruta: no existe." >&2
  elif [ ! -r "$ruta" ]; then
    echo "No puedo leer la clave de la app en $ruta: no tengo permiso para leerla." >&2
  elif ! openssl rsa -in "$ruta" -noout >/dev/null 2>&1; then
    echo "No puedo leer la clave de la app en $ruta: no es una clave privada RSA (la que da GitHub al crear la app)." >&2
  else
    return 0
  fi
  return 1
}

jwt() { # el JWT de la app: diez minutos como máximo (iat un minuto atrás por si el reloj se adelanta)
  local ahora cab carga firma
  ahora=$(date +%s)
  cab=$(printf '{"alg":"RS256","typ":"JWT"}' | b64url)
  carga=$(printf '{"iat":%d,"exp":%d,"iss":"%s"}' $((ahora - 60)) $((ahora + 540)) "$APP_ID" | b64url)
  firma=$(printf '%s.%s' "$cab" "$carga" | openssl dgst -sha256 -sign "$APP_CLAVE" -binary 2>/dev/null | b64url)
  [ -n "$firma" ] || return 1
  printf '%s.%s.%s' "$cab" "$carga" "$firma"
}

# metodo camino jwt → HTTP en CODIGO, cuerpo en $T/cuerpo, cabeceras en $T/cab; 1 si curl no llegó (sin red)
CODIGO=""
pedir() {
  local err
  err="$T/curl-err"
  CODIGO=$(printf 'header = "Authorization: Bearer %s"\n' "$3" |
    curl -sS --connect-timeout 10 -m 30 -X "$1" -D "$T/cab" -o "$T/cuerpo" -w '%{http_code}' --config - \
      -H 'Accept: application/vnd.github+json' -H 'X-GitHub-Api-Version: 2022-11-28' "$APP_API$2" 2>"$err")
  local rc=$?
  if [ "$rc" != 0 ]; then
    echo "Sin red para pedir el token de la app: $(head -c 200 "$err" | tr '\n' ' ')" >&2
    return 1
  fi
}

rechazado() { # el motivo de un pedido que GitHub rechazó; 5 si es el reloj, 6 si no
  local fecha srv dif msj
  fecha=$(grep -i '^date:' "$T/cab" 2>/dev/null | head -n 1 | cut -d' ' -f2- | tr -d '\r')
  if [ "$CODIGO" = 401 ] && [ -n "$fecha" ] && srv=$(date -d "$fecha" +%s 2>/dev/null); then
    dif=$((srv - $(date +%s)))
    if [ "${dif#-}" -gt 30 ]; then
      echo "El reloj de la máquina está corrido ${dif#-} s respecto de GitHub y GitHub rechaza el JWT de la app. Sincronízalo: timedatectl set-ntp true" >&2
      return 5
    fi
  fi
  msj=$(jq -r '.message // empty' "$T/cuerpo" 2>/dev/null | head -c 200)
  if [ "$CODIGO" = 404 ]; then
    echo "GitHub no dio el token de la app (HTTP $CODIGO): ${msj:-sin mensaje}. ¿La app sigue instalada? APP_INSTALACION=$APP_INSTALACION" >&2
  else
    echo "GitHub no dio el token de la app (HTTP $CODIGO): ${msj:-sin mensaje}" >&2
  fi
  return 6
}

renovar() { # pide un token nuevo y reescribe la caché (con el candado tomado)
  local j vence token permisos bot tmp
  clave_legible || return 4
  j=$(jwt) || { echo "No puedo leer la clave de la app en $APP_CLAVE: openssl no pudo firmar con ella." >&2; return 4; }
  pedir POST "/app/installations/$APP_INSTALACION/access_tokens" "$j" || return 1
  if [ "$CODIGO" != 201 ]; then
    rechazado
    return $?
  fi
  token=$(jq -r '.token // empty' "$T/cuerpo")
  vence=$(date -d "$(jq -r '.expires_at // empty' "$T/cuerpo")" +%s 2>/dev/null) || vence=""
  permisos=$(jq -c '.permissions // {}' "$T/cuerpo")
  if [ -z "$token" ] || [ -z "$vence" ]; then
    echo "GitHub no dio el token de la app (HTTP $CODIGO): la respuesta no trae token ni vencimiento." >&2
    return 6
  fi
  # El login de la app (<slug>[bot]), una sola vez: queda en la caché.
  bot=$BOT
  if [ -z "$bot" ] && pedir GET /app "$j" 2>/dev/null && [ "$CODIGO" = 200 ]; then
    bot=$(jq -r '(.slug // empty) | . + "[bot]"' "$T/cuerpo")
  fi
  tmp=$(mktemp "$CACHE.XXXXXX")
  printf '%s\n%s\n%s\n%s\n' "$vence" "$token" "$bot" "$permisos" >"$tmp"
  mv -f "$tmp" "$CACHE"
  leer_cache || return 6
}

asegurar() { # deja la caché fresca; el código de salida de arriba si no puede
  cache_fresca && return 0
  configurada || return 3
  umask 077
  mkdir -p "$CACHE_DIR" && chmod 700 "$CACHE_DIR"
  T=$(mktemp -d)
  trap 'rm -rf "$T"' EXIT
  exec 9>"$CACHE.lock"
  flock -w 60 9 || { echo "No pude tomar el candado de la caché del token de la app ($CACHE.lock)." >&2; return 1; }
  # Otro proceso pudo renovarla mientras esperábamos el candado.
  cache_fresca && return 0
  leer_cache || true
  renovar
}

credencial() { # get|store|erase — la entrada de git por stdin
  local linea protocolo="" host="" entrada="" rc
  while IFS= read -r linea && [ -n "$linea" ]; do
    entrada+="$linea"$'\n'
    case "$linea" in
      protocol=*) protocolo=${linea#protocol=} ;;
      host=*) host=${linea#host=} ;;
    esac
  done
  [ "${1:-}" = get ] || return 0
  [ "$protocolo" = https ] && [ "$host" = github.com ] || return 0
  asegurar
  rc=$?
  if [ "$rc" = 0 ]; then
    printf 'username=x-access-token\npassword=%s\n' "$TOKEN"
    return 0
  fi
  # Sin la app, la sesión de gh de la máquina: un push nunca se traba por esto.
  printf '%s\n' "$entrada" | gh auth git-credential get
}

case "${1:-}" in
  credencial) credencial "${2:-}" ;;
  --bot) asegurar && printf '%s\n' "$BOT" ;;
  --permisos) asegurar && printf '%s\n' "${PERMISOS:-null}" ;;
  --vence) asegurar && printf '%s\n' "$VENCE" ;;
  '') asegurar && printf '%s\n' "$TOKEN" ;;
  *) echo "uso: token-app.sh [credencial get|store|erase | --bot | --permisos | --vence]" >&2; exit 64 ;;
esac
