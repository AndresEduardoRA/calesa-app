# shellcheck shell=bash
# Lo que se arregla sin abrir una sesión de arreglo (README.md › «Cómo decide»): casos que en una tanda costaban una sesión de Opus y
# una hora de reloj cada uno, y que no piden criterio.
#   - `reintentar_ci_ajeno`: todo lo caído en el CI es ajeno al PR (un bloque de e2e en specs que el PR no toca, o la máquina del CI:
#     Docker, la red, el runner, GitHub) → se vuelven a correr los jobs caídos, hasta REINTENTOS_CI_POR_PUNTA veces por punta del PR
#     (con un bloque de e2e entre lo caído, una sola vez por tarea).
#   - `poner_al_dia_sin_sesion`: el PR choca con main sólo en docs Markdown (las listas que suman todas las tareas: PENDIENTES,
#     DECISIONES, LECCIONES…) → merge de main con la unión de las dos partes en esos docs. Si choca algo más, va la sesión.
#   - `migraciones_tras_main`: otra tarea integró una migración más nueva que las de la rama (el CI exige que las del PR vayan después,
#     scripts/guardas/orden-de-migraciones.test.ts) → merge de main y las de la rama renombradas, en su orden, con la hora de ahora.
# Lo carga orquestador.sh con `source`; usa sus `EST`, `WTS`, `log`, `est_get`, `est_set`, `ghr` y `campo`/`spec_de`.

# Los nombres de los jobs de e2e del CI (`e2e · bloque i de n`; `e2e · compilar la app` no: si no compila, es del PR).
ES_JOB_DE_E2E='^e2e · bloque '
# Lo que en el log de un job caído dice que cayó la máquina del CI y no el PR. Estrecho a propósito: un falso positivo cuesta una vuelta
# del CI; uno que falta, una sesión.
ES_INFRA='failed to start containers|Error response from daemon|toomanyrequests|pull rate limit|The runner has received a shutdown signal|lost communication with the server|No space left on device|ERR_PNPM_(META_FETCH_FAIL|FETCH_[0-9]+|SOCKET_TIMEOUT)|EAI_AGAIN|Failed to download action|Unable to resolve action|is unhealthy'
MIGRACIONES=supabase/migrations

# json-del-pr → una línea «nombre<TAB>job<TAB>run» por job caído (sin el agregador «Listo»).
jobs_caidos() {
  local nombre url
  jq -r '.statusCheckRollup[]? | select(.__typename == "CheckRun" and .conclusion == "FAILURE" and ((.name | startswith("Listo")) | not)) | [.name, (.detailsUrl // "")] | @tsv' <<<"$1" |
    while IFS=$'\t' read -r nombre url; do
      printf '%s\t%s\t%s\n' "$nombre" "$(sed -nE 's#.*/job/([0-9]+).*#\1#p' <<<"$url")" "$(sed -nE 's#.*/actions/runs/([0-9]+).*#\1#p' <<<"$url")"
    done
}

# job run → lo que falló de ese job (sin job, lo de toda la corrida: ahí el final es el del agregador, que no dice nada).
log_del_job() {
  if [ -n "$1" ]; then ghr run view --job "$1" --log-failed 2>/dev/null; else ghr run view "$2" --log-failed 2>/dev/null; fi
}

# id json-del-pr → 0 si ya cayó un job que no es un bloque de e2e (lint, tipos, pruebas, base, el build) sin la firma de la máquina del
# CI: ese rojo es del PR y va a la sesión sin esperar a «Listo», que llega tras los bloques de e2e (unos 20 min después de un rojo que
# cae en el primero). Los bloques de e2e sí esperan a «Listo»: relanzar lo ajeno pide la corrida terminada. Un job ya juzgado de la
# máquina no se vuelve a leer en cada vuelta (`temprano_visto`).
cayo_lo_del_pr() {
  local id=$1 nombre job run vistos
  vistos=$(est_get "$id" temprano_visto)
  while IFS=$'\t' read -r nombre job run; do
    grep -qE "$ES_JOB_DE_E2E" <<<"$nombre" && continue
    [ -n "$run" ] || continue
    [[ " $vistos " == *" ${job:-$run} "* ]] && continue
    if grep -qE "$ES_INFRA" <<<"$(log_del_job "$job" "$run")"; then
      vistos="$vistos ${job:-$run}"
      est_set "$id" temprano_visto "$vistos"
      continue
    fi
    return 0
  done < <(jobs_caidos "$2")
  return 1
}

# id pr json-del-pr → 0 si relanzó lo caído o espera el relanzamiento recién pedido (no hay que abrir sesión), 1 si no corresponde.
reintentar_ci_ajeno() {
  local id=$1 pr=$2 j=$3 sha n caidos nombre job run log propios="" runs="" que="" r e2e=""
  sha=$(jq -r .headRefOid <<<"$j")
  [ -n "$sha" ] || return 1
  n=0
  if [ "$(est_get "$id" reintento_ci)" = "$sha" ]; then
    # Ya se relanzó esta punta: los primeros minutos GitHub todavía puede mostrar el rojo viejo; después, el rojo es de verdad.
    [ "$(date +%s)" -lt $(($(est_get "$id" reintento_ci_en) + 600)) ] && return 0
    n=$(est_get "$id" reintentos_ci)
    n=${n:-1}
    [ "$n" -lt "${REINTENTOS_CI_POR_PUNTA:-2}" ] || return 1
  fi
  caidos=$(jobs_caidos "$j")
  [ -n "$caidos" ] || return 1
  while IFS=$'\t' read -r nombre job run; do
    [ -n "$run" ] || return 1
    log=$(log_del_job "$job" "$run")
    if grep -qE "$ES_INFRA" <<<"$log"; then
      que="$que, $nombre (la máquina del CI)"
    elif grep -qE "$ES_JOB_DE_E2E" <<<"$nombre"; then
      # Un spec caído que el PR toca es del PR: nada de reintentar.
      [ -n "$propios" ] || propios=$(ghr api --paginate "repos/{owner}/{repo}/pulls/$pr/files?per_page=100" --jq '.[].filename' 2>/dev/null) || return 1
      grep -oE 'e2e/[A-Za-z0-9_./-]+\.spec\.ts' <<<"$log" | grep -qxF -f <(printf '%s\n' "$propios") && return 1
      que="$que, $nombre (e2e ajeno al PR)"
      e2e=1
    else
      # Lint, tipos, pruebas, base o el build caídos sin señal de la máquina: son del PR.
      return 1
    fi
    [[ " $runs " == *" $run "* ]] || runs="$runs $run"
  done <<<"$caidos"
  # Un bloque de e2e en rojo ya cayó dos veces (Playwright reintenta una en CI): relanzarlo rara vez lo pone verde (1 de 7 tareas en
  # una tanda) y cada vuelta son ~20 min. Una vez por tarea, no por punta: cada puesta al día con main es una punta nueva.
  if [ -n "$e2e" ]; then
    [ -z "$(est_get "$id" e2e_ajeno_relanzado)" ] || return 1
    est_set "$id" e2e_ajeno_relanzado "$sha"
  fi
  est_set "$id" reintento_ci "$sha"
  est_set "$id" reintento_ci_en "$(date +%s)"
  est_set "$id" reintentos_ci $((n + 1))
  for r in $runs; do
    ghr run rerun "$r" --failed >/dev/null 2>&1 || { log "$id: no se pudo relanzar la corrida $r del PR #$pr"; return 1; }
  done
  log "$id: el CI del PR #$pr cayó sólo en lo ajeno al PR (${que#, }): relanzo lo caído ($((n + 1)) de ${REINTENTOS_CI_POR_PUNTA:-2} en esta punta) antes de abrir una sesión"
  return 0
}

# ------------------------------------------------------------------------------------------- ponerse al día con main sin sesión

# El worktree de la tarea, en su rama y limpio, o 1.
worktree_listo() { # id → imprime la rama
  local wt="$WTS/$1" rama
  [ -d "$wt" ] || return 1
  rama=$(campo "$(spec_de "$1")" rama)
  [ -n "$rama" ] && [ "$(git -C "$wt" symbolic-ref --quiet --short HEAD 2>/dev/null)" = "$rama" ] || return 1
  [ -z "$(git -C "$wt" status --porcelain)" ] || return 1
  echo "$rama"
}

# wt → las migraciones del índice que origin/main no tiene (las de la rama), en orden.
migraciones_propias() {
  comm -13 <(git -C "$1" ls-tree --name-only origin/main "$MIGRACIONES/" | sed 's#.*/##' | sort) \
    <(git -C "$1" ls-files "$MIGRACIONES" | sed 's#.*/##' | sort) | grep -E '^[0-9]{14}_[a-z0-9_]+\.sql$'
}

ultima_de_main() { git -C "$1" ls-tree --name-only origin/main "$MIGRACIONES/" | sed 's#.*/##' | grep -E '^[0-9]{14}_' | sort | tail -n 1; }

# wt → 0 si alguna migración de la rama no va después de la última de origin/main.
migraciones_fuera_de_orden() {
  local propias ultima
  propias=$(migraciones_propias "$1")
  ultima=$(ultima_de_main "$1")
  [ -n "$propias" ] && [ -n "$ultima" ] && [[ ! "$(head -n 1 <<<"$propias" | cut -c1-14)" > "${ultima:0:14}" ]]
}

# wt → renombra (git mv) todas las migraciones de la rama, en su orden, con la hora UTC de ahora (o un segundo después de la última de
# main, si el reloj va atrás); imprime cuántas. Todas y no sólo las viejas: así no cambia el orden entre ellas.
renumerar_migraciones() {
  local wt=$1 ultima t tope f n=0
  migraciones_fuera_de_orden "$wt" || return 0
  ultima=$(ultima_de_main "$wt")
  t=$(date -u +%s)
  tope=$(date -u -d "${ultima:0:8} ${ultima:8:2}:${ultima:10:2}:${ultima:12:2}" +%s)
  [ "$t" -gt "$tope" ] || t=$((tope + 1))
  for f in $(migraciones_propias "$wt"); do
    git -C "$wt" mv "$MIGRACIONES/$f" "$MIGRACIONES/$(date -u -d "@$t" +%Y%m%d%H%M%S)_${f#*_}" || return 1
    t=$((t + 1))
    n=$((n + 1))
  done
  echo "$n"
}

# id pr → merge de main en la rama (un choque sólo en docs se une; otro choque deja todo como estaba), las migraciones de la rama
# después de las de main, y push. 0 si empujó (o ya no había nada que hacer); 1 si va la sesión.
poner_al_dia_sin_sesion() {
  local id=$1 pr=$2 wt="$WTS/$1" rama chocan="" f base nuestro suyo renombradas hecho=""
  rama=$(worktree_listo "$id") || return 1
  git -C "$wt" fetch -q origin main 2>/dev/null || return 1
  git -C "$wt" pull -q --ff-only origin "$rama" 2>/dev/null || true
  if ! git -C "$wt" merge -q --no-edit origin/main >/dev/null 2>&1; then
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
    hecho="los docs que chocaban (${chocan//$'\n'/, }) unidos"
  fi
  renombradas=$(renumerar_migraciones "$wt") || { git -C "$wt" reset -q --hard "origin/$rama" 2>/dev/null; return 1; }
  if [ -n "$renombradas" ]; then
    git -C "$wt" commit -q -m "chore(db): llevar las migraciones de la rama después de las de main" >/dev/null 2>&1 ||
      { git -C "$wt" reset -q --hard "origin/$rama" 2>/dev/null; return 1; }
    hecho="${hecho:+$hecho; }$renombradas migraciones renombradas después de las de main"
  fi
  if ! git -C "$wt" push -q origin "HEAD:$rama" >/dev/null 2>&1; then
    log "$id: puse al día el PR #$pr con main pero no pude empujar: va la sesión"
    return 1
  fi
  log "$id: el PR #$pr se puso al día con main sin abrir una sesión (${hecho:-merge sin choques})"
  return 0
}

# id pr → 0 si las migraciones de la rama quedaban antes de una de main y se pusieron después (empujado: el CI vuelve a correr); 1 si
# no hacía falta o no se pudo (sigue lo de siempre: el reintento, la puesta al día de GitHub o la sesión).
migraciones_tras_main() {
  local id=$1 wt="$WTS/$1"
  worktree_listo "$id" >/dev/null || return 1
  git -C "$wt" fetch -q origin main 2>/dev/null || return 1
  migraciones_fuera_de_orden "$wt" || return 1
  poner_al_dia_sin_sesion "$id" "$2"
}
