#!/usr/bin/env bash
# Un `curl` falso para las pruebas del token de la app (token-app.test.ts, app.test.ts): no sale a la red. Lee lo que usa token-app.sh
# (`-X`, `-D <archivo>`, `-o <archivo>`, `-w '%{http_code}'`, `--config -` por stdin y la URL) y responde según
# $CURL_FALSO/respuestas.json: `{ "sinRed": bool, "<MÉTODO> <camino>": { "status": n, "fecha": "<cabecera Date>", "body": {…} } }`.
# Un camino sin respuesta da 404. Cada llamada queda en $CURL_FALSO/llamadas.log: una línea JSON con su argv y lo que leyó de stdin.
set -uo pipefail
dir=${CURL_FALSO:?falta CURL_FALSO}
metodo=GET cab="" salida="" formato="" url="" config=0 entrada=""
args=("$@")
while [ $# -gt 0 ]; do
  case "$1" in
    -X) metodo=$2 && shift ;;
    -D) cab=$2 && shift ;;
    -o) salida=$2 && shift ;;
    -w) formato=$2 && shift ;;
    -H | -m | --connect-timeout) shift ;;
    --config) [ "$2" = - ] && config=1 && shift ;;
    -*) ;;
    *) url=$1 ;;
  esac
  shift
done
[ "$config" = 1 ] && entrada=$(cat)
jq -nc --arg stdin "$entrada" '{argv: $ARGS.positional, stdin: $stdin}' --args -- "${args[@]}" >>"$dir/llamadas.log"

r="$dir/respuestas.json"
if [ "$(jq -r '.sinRed // false' "$r")" = true ]; then
  echo "curl: (6) Could not resolve host: api.github.com" >&2
  exit 6
fi
camino="/${url#*://*/}"
clave="$metodo $camino"
status=$(jq -r --arg k "$clave" '.[$k].status // 404' "$r")
fecha=$(jq -r --arg k "$clave" '.[$k].fecha // empty' "$r")
[ -n "$fecha" ] || fecha=$(LC_ALL=C date -u '+%a, %d %b %Y %H:%M:%S GMT')
[ -n "$cab" ] && printf 'HTTP/2 %s\r\ndate: %s\r\ncontent-type: application/json\r\n\r\n' "$status" "$fecha" >"$cab"
cuerpo=$(jq -c --arg k "$clave" '.[$k].body // {message: "Not Found"}' "$r")
if [ -n "$salida" ]; then printf '%s' "$cuerpo" >"$salida"; else printf '%s' "$cuerpo"; fi
[ "$formato" = '%{http_code}' ] && printf '%s' "$status"
exit 0
