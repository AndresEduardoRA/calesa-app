# shellcheck shell=bash
# Las dependencias en el hook de Bash: lo carga `bloquear-peligrosos.sh` (que pone `bloquear`, `raiz_del_repo`, `junto_a_un_cd`,
# `A`, `CWD` y `CMD`) y se prueba con él (`scripts/guardas/bloquear-peligrosos.test.ts`). Actualizar, quitar, lo global, npm/yarn
# y `next upgrade` se rechazan; agregar con pnpm, sólo lo de la lista aprobada del repo donde corre
# (docs/DECISIONES.md › «Stack y arquitectura»).

# Lo único que una sesión agrega con pnpm. Se lee de la raíz del repo donde corre (el worktree), no de una ruta fija.
LISTA_APROBADA=scripts/orquestador/dependencias-aprobadas.txt
APROBADOS=()

# Una opción de pnpm que lleva su valor aparte (`--filter web`, `-C dir`).
es_opcion_con_valor() {
  case "$1" in --filter | -F | --dir | -C | --prefix | --registry | --store-dir | --reporter | --loglevel) return 0 ;; esac
  return 1
}

# Hay un argumento que no es una opción ni el valor de una (`--filter web`, `--dir x`): un paquete.
hay_posicional() {
  local t saltar=0
  for t in "$@"; do
    if [ "$saltar" = 1 ]; then saltar=0; continue; fi
    case "$t" in
      -*) es_opcion_con_valor "$t" && saltar=1 ;;
      *) return 0 ;;
    esac
  done
  return 1
}

# Llena APROBADOS con los nombres de la lista: sin lo que va desde `#`, sin `\r` y sin los espacios de los bordes. Si el archivo
# falta, no es un archivo común o no se puede leer, queda vacía (y sin lista no entra nada).
leer_lista() {
  local linea
  APROBADOS=()
  { [ -f "$1" ] && [ -r "$1" ]; } || return 0
  while IFS= read -r linea || [ -n "$linea" ]; do
    linea="${linea%%#*}"
    linea="${linea//$'\r'/}"
    linea="${linea#"${linea%%[![:space:]]*}"}"
    linea="${linea%"${linea##*[![:space:]]}"}"
    [ -n "$linea" ] && APROBADOS+=("$linea")
  done <"$1"
  return 0
}

# El nombre está tal cual en la lista: se compara la cadena entera (`react` no pasa por estar `@xyflow/react`).
aprobado() {
  local a
  for a in "${APROBADOS[@]}"; do [ "$a" = "$1" ] && return 0; done
  return 1
}

# `@scope/x@1.2.3` → `@scope/x`; `x@1.2.3` → `x`.
nombre_sin_version() {
  local p="$1"
  case "$p" in
    @*) p="${p#@}"; printf '@%s' "${p%%@*}" ;;
    *) printf '%s' "${p%%@*}" ;;
  esac
}

# `pnpm add` pasa sólo si cada paquete nombrado está en la lista aprobada, como `nombre` o `nombre@versión` (nada de alias `npm:`,
# git, rutas ni URLs: meterían otro paquete con un nombre aprobado), con -D/-E como únicas opciones y sin `cd` delante.
revisar_agregar() {
  local lista t nombre paquetes=0
  local re='^(@[A-Za-z0-9._-]+/)?[A-Za-z0-9._-]+(@[A-Za-z0-9._^~*+-]+)?$'
  junto_a_un_cd && bloquear "pnpm add junto a un cd: el hook no ve en qué repo queda. Córrelo desde la raíz del worktree."
  lista="$(raiz_del_repo)/$LISTA_APROBADA"
  leer_lista "$lista"
  [ "${#APROBADOS[@]}" -gt 0 ] ||
    bloquear "pnpm add: no hay lista aprobada legible en $lista (falta o está vacía): sin lista no entra ningún paquete."
  for t in "$@"; do
    case "$t" in
      -g | --global) bloquear "Nada global: contamina la máquina del usuario." ;;
      -D | --save-dev | -E | --save-exact | -DE | -ED) continue ;;
      -*) bloquear "pnpm add $t: sólo con -D/--save-dev y -E/--save-exact." ;;
    esac
    [[ "$t" =~ $re ]] || bloquear "pnpm add $t: va el nombre o nombre@versión, sin alias (npm:), git, rutas ni URLs."
    nombre=$(nombre_sin_version "$t")
    aprobado "$nombre" ||
      bloquear "pnpm add $nombre: no está en la lista aprobada ($LISTA_APROBADA). Como último recurso, súmalo a esa lista en el mismo PR con la sección «Dependencias nuevas»."
    paquetes=$((paquetes + 1))
  done
  [ "$paquetes" -gt 0 ] || bloquear "pnpm add sin paquete: nombra uno de $LISTA_APROBADA."
}

# El subcomando de pnpm y lo que le sigue. Usa `antes` y `global` de revisar_pnpm (bash ve las locales de quien llama).
revisar_sub_pnpm() {
  local sub="${1:-}"
  [ "$#" -gt 0 ] && shift
  case "$sub" in
    add)
      [ "$global" = 1 ] && bloquear "Nada global: contamina la máquina del usuario."
      [ -n "$antes" ] &&
        bloquear "pnpm $antes … add: corre pnpm add solo, desde la raíz del repo de la lista (sin -C, --dir, --filter, -r ni -w)."
      revisar_agregar "$@" ;;
    add* | up | update | upgrade | up*) bloquear "pnpm $sub cambia dependencias: se verifican y las decide una persona." ;;
    remove | rm | uninstall | un) bloquear "pnpm $sub cambia dependencias: lo decide una persona." ;;
    i | install)
      hay_posicional "$@" &&
        bloquear "pnpm $sub <paquete> cambia dependencias: se agrega con pnpm add y sólo lo de $LISTA_APROBADA." ;;
    next) [ "${1:-}" = upgrade ] && bloquear "next upgrade lo decide una persona." ;;
  esac
  return 0
}

# El subcomando va después de las opciones globales (`pnpm -C x up`, `pnpm --filter web remove`): mirar sólo el primer argumento
# las dejaría pasar.
revisar_pnpm() {
  local i=0 t antes="" global=0
  while [ "$i" -lt "${#A[@]}" ]; do
    t="${A[$i]}"
    case "$t" in
      -*)
        antes="$t"
        case "$t" in -g | --global) global=1 ;; esac
        if es_opcion_con_valor "$t"; then i=$((i + 2)); else i=$((i + 1)); fi ;;
      *) break ;;
    esac
  done
  local R=("${A[@]:$i}")
  revisar_sub_pnpm "${R[@]}"
  # Una opción con valor que no está en es_opcion_con_valor dejaría su valor como subcomando: con opciones delante, también se
  # mira el que sigue (`pnpm --workspace-concurrency 4 up`).
  [ -n "$antes" ] && revisar_sub_pnpm "${R[@]:1}"
  return 0
}
