# shellcheck shell=bash
# main en rojo en una tanda (README.md › «Vigila»): la red de seguridad si algo entra roto (sin la cola de integración activa, o por la
# noche). La cola de integración (integracion.sh) prueba cada PR combinado con main y los de delante antes de integrarlo; si igual main
# queda en rojo, `vigilar_main` mira el CI del push a main y, en rojo, encola una vez por sha la tarea urgente de dejarlo verde
# (plantillas/main-en-rojo-en-tanda.md); mientras main siga en rojo, `lanzar` no arranca tareas nuevas que no sean urgentes.
# Lo carga orquestador.sh con `source`; usa sus `REPO`, `EST`, `ORQ`, `REPO_GH`, `log`, `avisar`, `urgente`, `est_get`, `est_set`, `ghc` y
# `caidos_de` de cierre-main.sh.

# Cada cuánto se mira el CI de main (segundos).
MAIN_VISTO_CADA_S=${MAIN_VISTO_CADA_S:-300}

# 0 si main quedó en rojo y no hay todavía un verde de su punta (`estado/.main-rojo`: el sha en rojo).
main_rojo() { [ -f "$EST/.main-rojo" ]; }

# spec → 0 si esa tarea nueva no arranca: main en rojo y no es la urgente que lo arregla (ni otra urgente).
frena_lo_nuevo() { main_rojo && ! urgente "$1"; }

# El CI del push a main en su punta (una vez cada MAIN_VISTO_CADA_S): verde quita la marca; rojo la pone y encola la tarea urgente.
vigilar_main() {
  local sha j estado conclusion id
  [ "$(date +%s)" -ge $(($(cat "$EST/.main-visto" 2>/dev/null || echo 0) + MAIN_VISTO_CADA_S)) ] || return 0
  date +%s >"$EST/.main-visto"
  sha=$(git -C "$REPO" rev-parse -q --verify origin/main 2>/dev/null) || return 0
  j=$(ghc run list --workflow ci.yml --event push --branch main --limit 10 --json databaseId,headSha,status,conclusion 2>/dev/null) ||
    return 0
  j=$(jq -c --arg sha "$sha" '[.[] | select(.headSha == $sha)] | first // empty' <<<"$j")
  [ -n "$j" ] || return 0
  estado=$(jq -r .status <<<"$j")
  conclusion=$(jq -r .conclusion <<<"$j")
  id=$(jq -r .databaseId <<<"$j")
  [ "$estado" = completed ] || return 0
  case "$conclusion" in
    success)
      if main_rojo; then
        rm -f "$EST/.main-rojo"
        log "main en verde otra vez (${sha:0:7}): sigo lanzando tareas nuevas"
      fi
      ;;
    failure)
      echo "$sha" >"$EST/.main-rojo"
      main_rojo_en_tanda "$sha" "$id"
      ;;
  esac
}

# sha id — la tarea urgente de dejar main verde, una vez por sha (`estado/.main-rojo-encolado`).
main_rojo_en_tanda() {
  local sha=$1 id=$2 f t
  [ "$(cat "$EST/.main-rojo-encolado" 2>/dev/null)" = "$sha" ] && return 0
  f="$EST/main-rojo-${sha:0:7}.md"
  t=$(<"$ORQ/plantillas/main-en-rojo-en-tanda.md")
  t=${t//'{{SHA_CORTO}}'/${sha:0:7}}
  t=${t//'{{SHA}}'/$sha}
  t=${t//'{{CORRIDA}}'/https://github.com/$REPO_GH/actions/runs/$id}
  t=${t//'{{ID_CORRIDA}}'/$id}
  printf '%s\n' "${t//'{{CAIDOS}}'/$(caidos_de "$id")}" >"$f"
  publicar_entrada "$f" || return 0
  if [ -n "$PUBLICADA" ]; then
    echo "$sha" >"$EST/.main-rojo-encolado"
    log "$PUBLICADA: main en rojo en ${sha:0:7} (corrida $id): la tarea urgente de dejarlo verde, a la cola; no lanzo tareas nuevas hasta que vuelva a verde"
    avisar "main en rojo" "El CI de main (${sha:0:7}) cayó: $PUBLICADA, urgente, en la cola. Las tareas nuevas esperan." high warning "$(enlace_issue "$PUBLICADA")"
  elif [ -f "$f.error" ]; then
    echo "$sha" >"$EST/.main-rojo-encolado"
    log "✗ la tarea de main en rojo no se publica: plantillas/main-en-rojo-en-tanda.md no se lee ($(cat "$f.error"))"
  fi
}
