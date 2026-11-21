# shellcheck shell=bash
# La cola de integración (la merge queue de GitHub: docs/FLUJO.md › «GitHub», README.md › «Vigila»). Un PR en verde entra a la cola con
# su auto-merge; GitHub lo prueba combinado con main y los PR de delante y lo integra. Nadie trae main a la rama. Con el CI del PR en
# verde, `vigilar_prs` llama a `atender_la_cola_de_integracion`:
#   - en la cola: anota la punta (`cola_sha`) y el puesto (al log sólo cuando cambia); nada más;
#   - fuera de la cola y sin auto-merge (GitHub lo apaga al sacarlo; o lo empujó una sesión o `migraciones_tras_main`): lo enciende, una
#     vez por punta (`auto_encendido`);
#   - sacado de la cola (una salida nueva: otro id que `cola_salida_vista`, no anterior a la última entrada y de la punta que entró):
#     `sacado_de_la_cola` → sus migraciones quedaban antes de una de main (`migraciones_tras_main` renombra y empuja), o todo lo caído
#     del grupo es ajeno al PR (la máquina del CI, un e2e que el PR no toca) y se vuelve a encolar (hasta REINTENTOS_CI_POR_PUNTA por
#     punta; un e2e ajeno, una vez por tarea), o no hay corrida del grupo en rojo (otro motivo de GitHub) y se vuelve a encolar una vez
#     por punta, o la tarea va a arreglo. Ese rojo lo causa la combinación con lo de delante (el PR estaba en verde): cuenta como choque
#     (MAX_CHOQUES), no como arreglo.
# Un PR sacado por conflicto lo atiende antes la rama CONFLICTING de `vigilar_prs`; su arreglo cambia la punta y la salida queda vieja.
# Lo carga orquestador.sh con `source`; usa sus `REPO`, `REPO_GH`, `log`, `est_get`, `est_set`, `ghr` y `a_arreglar`, y los de
# sin-sesion.sh (`migraciones_tras_main`, `caidos_ajenos`, `finales_de_logs`).

# shellcheck source=../flujo/cola-de-integracion.sh
source "$ORQ/../flujo/cola-de-integracion.sh"
# Los llena `caidos_ajenos` (sin-sesion.sh).
CAIDOS_QUE="" CAIDOS_E2E=""

# id pr json-del-pr → 0 siempre (si GitHub no responde, se mira en la vuelta siguiente).
atender_la_cola_de_integracion() {
  local id=$1 pr=$2 c sha puesto salida_id salida_cuando entrada cola_sha
  c=$(cd "$REPO" && estado_en_la_cola "$pr") || return 0
  sha=$(jq -r '.sha // ""' <<<"$c")
  [ -n "$sha" ] || return 0
  if [ "$(jq -r .enCola <<<"$c")" = true ]; then
    est_set "$id" cola_sha "$sha"
    puesto=$(jq -r '.puesto // "?"' <<<"$c")
    if [ "$puesto" != "$(est_get "$id" cola_puesto)" ]; then
      est_set "$id" cola_puesto "$puesto"
      log "$id: el PR #$pr en la cola de integración (puesto $puesto)"
    fi
    return 0
  fi
  salida_id=$(jq -r '.salida.id // ""' <<<"$c")
  salida_cuando=$(jq -r '.salida.cuando // ""' <<<"$c")
  entrada=$(jq -r '.entrada // ""' <<<"$c")
  cola_sha=$(est_get "$id" cola_sha)
  if [ -n "$salida_id" ] && [ "$salida_id" != "$(est_get "$id" cola_salida_vista)" ] &&
    { [ -z "$entrada" ] || [[ ! "$salida_cuando" < "$entrada" ]]; }; then
    est_set "$id" cola_salida_vista "$salida_id"
    est_set "$id" cola_puesto ""
    if [ -z "$cola_sha" ] || [ "$cola_sha" = "$sha" ]; then
      sacado_de_la_cola "$id" "$pr" "$sha" "$(jq -r '.salida.motivo // ""' <<<"$c")"
      return 0
    fi
    # La salida es de una punta vieja (la arregló una sesión o un merge sin sesión): no dice nada de esta.
  fi
  if [ "$(jq -r .autoMerge <<<"$c")" != true ] && [ "$(est_get "$id" auto_encendido)" != "$sha" ]; then
    encender_auto_merge "$id" "$pr" "$sha" && log "$id: auto-merge encendido en el PR #$pr: en verde entra a la cola de integración"
  fi
  return 0
}

# id pr sha → 0 si encendió el auto-merge (una vez por punta, haya salido o no).
encender_auto_merge() {
  local id=$1 pr=$2 sha=$3 salida
  est_set "$id" auto_encendido "$sha"
  est_set "$id" cola_sha "$sha"
  if salida=$(ghr pr merge "$pr" --auto --squash 2>&1); then return 0; fi
  log "$id: no pude encender el auto-merge del PR #$pr: $(head -c 300 <<<"$salida")"
  return 1
}

# id pr sha motivo-de-github → arregla sin sesión, vuelve a encolar o manda a arreglo.
sacado_de_la_cola() {
  local id=$1 pr=$2 sha=$3 motivo=$4 run caidos n
  if migraciones_tras_main "$id" "$pr"; then
    log "$id: la cola de integración sacó el PR #$pr y sus migraciones quedaban antes de una de main: renombradas y empujadas (el CI vuelve a correr)"
    return 0
  fi
  run=$(cd "$REPO" && corrida_del_grupo "$pr")
  caidos=""
  [ -z "$run" ] || caidos=$(cd "$REPO" && caidos_del_grupo "$run")
  if [ -z "$caidos" ]; then
    if [ "$(est_get "$id" reencolado_sin_rojo)" != "$sha" ]; then
      est_set "$id" reencolado_sin_rojo "$sha"
      reencolar "$id" "$pr" "$sha" "un motivo de GitHub sin un job en rojo (${motivo:-sin motivo})"
      return 0
    fi
    a_arreglar "$id" "$(motivo_del_grupo "$pr" "$run" "$motivo" "")" choque
    return 0
  fi
  if caidos_ajenos "$pr" "$caidos"; then
    n=0
    [ "$(est_get "$id" reencolado)" = "$sha" ] && n=$(est_get "$id" reencolados)
    if [ "${n:-0}" -lt "${REINTENTOS_CI_POR_PUNTA:-2}" ] && { [ -z "$CAIDOS_E2E" ] || [ -z "$(est_get "$id" e2e_ajeno_relanzado)" ]; }; then
      [ -z "$CAIDOS_E2E" ] || est_set "$id" e2e_ajeno_relanzado "$sha"
      est_set "$id" reencolado "$sha"
      est_set "$id" reencolados $((${n:-0} + 1))
      reencolar "$id" "$pr" "$sha" "algo ajeno (${CAIDOS_QUE#, }; $((${n:-0} + 1)) de ${REINTENTOS_CI_POR_PUNTA:-2} en esta punta)"
      return 0
    fi
  fi
  a_arreglar "$id" "$(motivo_del_grupo "$pr" "$run" "$motivo" "$caidos")" choque
}

# id pr sha qué → vuelve a encender el auto-merge: con el CI del PR en verde, entra otra vez a la cola.
reencolar() {
  encender_auto_merge "$1" "$2" "$3" && log "$1: la cola de integración sacó el PR #$2 por $4: lo vuelvo a encolar"
}

# pr corrida motivo-de-github caídos(tsv) → el motivo.md de la sesión de arreglo. La primera línea es la del log y el aviso.
motivo_del_grupo() {
  local pr=$1 run=$2 motivo=$3 caidos=$4 nombres
  nombres=$(cut -f1 <<<"$caidos" | sed '/^$/d' | awk 'NR > 1 { printf ", " } { printf "%s", $0 }')
  echo "La cola de integración sacó el PR #$pr: el CI del grupo (combinado con main y los PR de delante) cayó: ${nombres:-ningún job en rojo a la vista}. Motivo de GitHub: ${motivo:-ninguno}."
  echo
  echo "Tu PR estaba en verde: lo rompe la combinación con lo que entró delante, que suele estar ya en main (git fetch origin && git merge origin/main)."
  [ -z "$run" ] || echo "La corrida del grupo: https://github.com/$REPO_GH/actions/runs/$run"
  [ -z "$caidos" ] || finales_de_logs "$caidos"
}
