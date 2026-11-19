# shellcheck shell=bash
# Integrar sin la rama al día (README.md › «Vigila»): main no exige «Require branches to be up to date» y un PR en verde entra aunque
# main haya avanzado. Dos cosas que esa regla cuidaba quedan acá:
#   - Un PR con migraciones nuevas no lleva auto-merge (publicar.sh no se lo enciende): lo integra `integrar_con_migraciones` cuando
#     está en verde y al día con main, y si quedó atrás lo pone al día primero (renombrando sus migraciones si hace falta). Así una
#     migración nunca entra antes que una más nueva que ya está en main.
#   - Dos PR en verde por separado pueden romper main juntos: `vigilar_main` mira el CI del push a main y, en rojo, encola una vez por sha
#     la tarea urgente de dejarlo verde (plantillas/main-en-rojo-en-tanda.md); mientras main siga en rojo, `lanzar` no arranca tareas
#     nuevas que no sean urgentes.
# Lo carga orquestador.sh con `source`; usa sus `REPO`, `EST`, `ORQ`, `REPO_GH`, `log`, `avisar`, `urgente`, `est_get`, `est_set`, `ghr`, `ghc` y
# los de sin-sesion.sh (`migraciones_tras_main`) y cierre-main.sh (`caidos_de`).

# Cada cuánto se mira el CI de main (segundos).
MAIN_VISTO_CADA_S=${MAIN_VISTO_CADA_S:-300}
CARPETA_DE_MIGRACIONES='supabase/migrations/'

# pr → 0 si el PR agrega migraciones.
con_migraciones() {
  ghr pr view "$1" --json files --jq '.files[].path' 2>/dev/null | grep -q "^$CARPETA_DE_MIGRACIONES"
}

# sha → cuántos commits de main le faltan (vacío si GitHub no respondió).
atras_de_main() {
  ghr api "repos/{owner}/{repo}/compare/main...$1" --jq .behind_by 2>/dev/null
}

# id pr json-del-pr → con el CI en verde: al día, lo integra (squash, sólo si la punta sigue siendo la probada); atrás, lo pone al día
# (una vez cada 15 min como mucho) y el CI vuelve a correr.
integrar_con_migraciones() {
  local id=$1 pr=$2 j=$3 sha atras ult salida
  sha=$(jq -r .headRefOid <<<"$j")
  atras=$(atras_de_main "$sha")
  [ -n "$atras" ] || return 0
  if [ "$atras" = 0 ]; then
    if salida=$(ghr pr merge "$pr" --squash --match-head-commit "$sha" 2>&1); then
      log "$id: PR #$pr con migraciones, en verde y al día con main: integrado"
    else
      log "$id: no se pudo integrar el PR #$pr: $(head -c 300 <<<"$salida")"
    fi
    return 0
  fi
  ult=$(est_get "$id" puesta_al_dia)
  [ "$(date +%s)" -gt $((${ult:-0} + 900)) ] || return 0
  est_set "$id" puesta_al_dia "$(date +%s)"
  migraciones_tras_main "$id" "$pr" && return 0
  if salida=$(ghr api -X PUT "repos/{owner}/{repo}/pulls/$pr/update-branch" -f expected_head_sha="$sha" 2>&1); then
    log "$id: PR #$pr con migraciones, $atras commits atrás de main: puesto al día antes de integrarlo"
  else
    log "$id: no se pudo poner al día el PR #$pr: $(head -c 300 <<<"$salida")"
  fi
}

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
