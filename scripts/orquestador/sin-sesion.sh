# shellcheck shell=bash
# Lo que se arregla sin abrir una sesión de arreglo (README.md › «Cómo decide»): dos casos que en una tanda costaban una sesión de Opus y
# una hora de reloj cada uno, y que no piden criterio.
#   - `reintentar_ci_una_vez`: el CI cayó sólo en e2e y en ningún spec que el PR toque → se vuelven a correr los jobs caídos, una vez
#     por punta del PR. Una prueba inestable de otro lado pasa al reintento; si vuelve a caer, ya va la sesión.
#   - `fusionar_docs`: el PR choca con main sólo en docs Markdown (las listas que suman todas las tareas: PENDIENTES, DECISIONES,
#     LECCIONES…) → merge de main con la unión de las dos partes en esos docs, commit y push. Si choca algo más, va la sesión.
# Lo carga orquestador.sh con `source`; usa sus `EST`, `WTS`, `log`, `est_get`, `est_set`, `ghr` y `campo`/`spec_de`.

# Los nombres de los jobs de e2e del CI (`e2e · bloque i de 4`, `e2e · compilar la app` no: si no compila, es del PR).
ES_JOB_DE_E2E='^e2e · bloque '

# id pr json-del-pr → 0 si relanzó los jobs caídos (no hay que abrir sesión), 1 si no corresponde.
reintentar_ci_una_vez() {
  local id=$1 pr=$2 j=$3 sha caidos runs propios spec r
  sha=$(jq -r .headRefOid <<<"$j")
  [ -n "$sha" ] || return 1
  if [ "$(est_get "$id" reintento_ci)" = "$sha" ]; then
    # Ya se relanzó esta punta: los primeros minutos GitHub todavía puede mostrar el rojo viejo; después, el rojo es de verdad.
    [ "$(date +%s)" -lt $(($(est_get "$id" reintento_ci_en) + 600)) ] && return 0
    return 1
  fi
  caidos=$(jq -r '.statusCheckRollup[]? | select(.__typename == "CheckRun" and .conclusion == "FAILURE" and ((.name | startswith("Listo")) | not)) | .name' <<<"$j")
  [ -n "$caidos" ] || return 1
  # Todo lo caído es un bloque de e2e: lint, tipos, pruebas, base o el build caídos son del PR.
  grep -qvE "$ES_JOB_DE_E2E" <<<"$caidos" && return 1
  runs=$(jq -r '.statusCheckRollup[]? | select(.__typename == "CheckRun" and .conclusion == "FAILURE") | .detailsUrl' <<<"$j" |
    sed -nE 's#.*/actions/runs/([0-9]+).*#\1#p' | sort -u)
  [ -n "$runs" ] || return 1
  # Un spec caído que el PR toca es del PR: nada de reintentar.
  propios=$(ghr pr view "$pr" --json files --jq '.files[].path' 2>/dev/null) || return 1
  for r in $runs; do
    for spec in $(ghr run view "$r" --log-failed 2>/dev/null | grep -oE 'e2e/[A-Za-z0-9_./-]+\.spec\.ts' | sort -u); do
      grep -qxF "$spec" <<<"$propios" && return 1
    done
  done
  est_set "$id" reintento_ci "$sha"
  est_set "$id" reintento_ci_en "$(date +%s)"
  for r in $runs; do
    ghr run rerun "$r" --failed >/dev/null 2>&1 || { log "$id: no se pudo relanzar la corrida $r del PR #$pr"; return 1; }
  done
  log "$id: el CI del PR #$pr cayó sólo en e2e ajenos al PR ($(tr '\n' ',' <<<"$caidos" | sed 's/,$//')): relanzo lo caído una vez antes de abrir una sesión"
  return 0
}

# id pr → 0 si resolvió el choque con main y empujó (no hay que abrir sesión), 1 si no corresponde (y deja el worktree como estaba).
fusionar_docs() {
  local id=$1 pr=$2 wt="$WTS/$1" rama chocan f base nuestro suyo
  [ -d "$wt" ] || return 1
  rama=$(campo "$(spec_de "$id")" rama)
  [ -n "$rama" ] && [ "$(git -C "$wt" symbolic-ref --quiet --short HEAD 2>/dev/null)" = "$rama" ] || return 1
  [ -z "$(git -C "$wt" status --porcelain)" ] || return 1
  git -C "$wt" fetch -q origin main 2>/dev/null || return 1
  git -C "$wt" pull -q --ff-only origin "$rama" 2>/dev/null || true
  if git -C "$wt" merge -q --no-edit origin/main >/dev/null 2>&1; then
    # Ya no chocaba (otra vuelta lo resolvió o main cambió): sólo falta empujar.
    :
  else
    chocan=$(git -C "$wt" diff --name-only --diff-filter=U)
    if [ -z "$chocan" ] || grep -qvE '^docs/[^/]+\.md$' <<<"$chocan"; then
      git -C "$wt" merge --abort >/dev/null 2>&1
      return 1
    fi
    base=$(mktemp) nuestro=$(mktemp) suyo=$(mktemp)
    for f in $chocan; do
      git -C "$wt" show ":1:$f" >"$base" 2>/dev/null || : >"$base"
      git -C "$wt" show ":2:$f" >"$nuestro" 2>/dev/null || : >"$nuestro"
      git -C "$wt" show ":3:$f" >"$suyo" 2>/dev/null || : >"$suyo"
      git merge-file --union "$nuestro" "$base" "$suyo"
      cp "$nuestro" "$wt/$f"
      git -C "$wt" add -- "$f"
    done
    rm -f "$base" "$nuestro" "$suyo"
    git -C "$wt" commit -q --no-edit >/dev/null 2>&1 || { git -C "$wt" merge --abort >/dev/null 2>&1; return 1; }
  fi
  if ! git -C "$wt" push -q origin "HEAD:$rama" >/dev/null 2>&1; then
    log "$id: resolví el choque de docs del PR #$pr pero no pude empujar: va la sesión"
    return 1
  fi
  log "$id: el PR #$pr chocaba con main sólo en docs (${chocan//$'\n'/, }): los uní y empujé sin abrir una sesión"
  return 0
}
