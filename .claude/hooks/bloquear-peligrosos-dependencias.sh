# shellcheck shell=bash
# Las dependencias en el hook de Bash: lo carga `bloquear-peligrosos.sh` (que pone `bloquear`, `raiz_del_repo`, `junto_a_un_cd`,
# `A`, `CWD`, `CMD`, `OTRA_CARPETA` y `CON_VARIABLES`) y se prueba con él (`scripts/guardas/bloquear-peligrosos.test.ts`).
# Actualizar, quitar, lo global, npm/yarn/bun y `next upgrade` se rechazan; agregar con pnpm, sólo lo de la lista aprobada del
# repo donde corre (docs/DECISIONES.md › «Stack y arquitectura»). También lee las opciones de los envoltorios que pueden dejar el
# agregar en otra carpeta (`npx`, `pnpm exec`, `sudo`, `env`) y la orden de pnpm metida en otro comando.

# Lo único que una sesión agrega con pnpm. Se lee de la raíz del repo donde corre (el worktree), no de una ruta fija.
LISTA_APROBADA=scripts/orquestador/dependencias-aprobadas.txt
APROBADOS=()
# Lo que, en cualquier parte del comando, cambia de dónde baja pnpm o adónde escribe (`export HOME=…; pnpm add x`).
VARIABLES_DE_PNPM='(npm|pnpm)_config_|node_options|pnpm_home|corepack_|(^|[^[:alnum:]_])(export|declare|typeset|set -a)([[:space:]]|$)'

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

# Una versión de verdad (`1.2.3`, `^10.0.0`, `~1.2`, `*`, `v1`) o una etiqueta sin punto (`latest`, `next`). pnpm lee como ruta lo
# que empieza con `.` y como tarball lo que termina en `.tgz`/`.tar`: eso metería código propio con un nombre aprobado.
version_valida() {
  local re='^([0-9^~*v=][A-Za-z0-9._^~*+-]*|[A-Za-z][A-Za-z0-9-]*)$'
  [[ "$1" =~ $re ]] && [[ "$1" =~ [A-Za-z0-9*]$ ]] || return 1
  case "${1,,}" in *.tgz | *.tar | *.tar.gz) return 1 ;; esac
  return 0
}

# `pnpm add` pasa sólo si cada paquete nombrado está en la lista aprobada, como `nombre` o `nombre@versión` (nada de alias `npm:`,
# git, rutas, tarballs ni URLs: meterían otro paquete con un nombre aprobado), con -D/-E como únicas opciones, sin `cd` ni otra
# carpeta delante y sin variables que cambien de dónde baja (`npm_config_registry=…`).
revisar_agregar() {
  local lista t nombre version paquetes=0
  local re='^(@[A-Za-z0-9._-]+/)?[A-Za-z0-9._-]+$'
  junto_a_un_cd && bloquear "pnpm add junto a un cd: el hook no ve en qué repo queda. Córrelo desde la raíz del worktree."
  [ "$OTRA_CARPETA" = 1 ] &&
    bloquear "pnpm add en otra carpeta (env -C, sudo -D, pnpm -C … exec, npx con opciones): córrelo solo, desde la raíz del worktree."
  { [ "$CON_VARIABLES" = 1 ] || printf '%s' "$CMD" | grep -qiE "$VARIABLES_DE_PNPM"; } &&
    bloquear "pnpm add con variables (npm_config_*, NODE_OPTIONS, export…): cambian de dónde baja o adónde va. Córrelo solo."
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
    nombre=$(nombre_sin_version "$t")
    version="${t#"$nombre"}"
    { [[ "$nombre" =~ $re ]] && { [ -z "$version" ] || version_valida "${version#@}"; }; } ||
      bloquear "pnpm add $t: va el nombre o nombre@versión, sin alias (npm:), git, rutas, tarballs ni URLs."
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
    remove | rm | uninstall | un | link | ln | import | patch-commit | patch-remove)
      bloquear "pnpm $sub cambia dependencias: lo decide una persona." ;;
    dedupe) case " $* " in *" --check "*) ;; *) bloquear "pnpm dedupe reescribe el lockfile: lo decide una persona." ;; esac ;;
    \$*) bloquear "pnpm con el subcomando en una variable ($sub): el hook no ve cuál es." ;;
    i | install)
      hay_posicional "$@" &&
        bloquear "pnpm $sub <paquete> cambia dependencias: se agrega con pnpm add y sólo lo de $LISTA_APROBADA." ;;
    next) [ "${1:-}" = upgrade ] && bloquear "next upgrade lo decide una persona." ;;
    set | self-update) bloquear "pnpm $sub cambia pnpm o su configuración en la máquina: lo decide una persona." ;;
    config | env)
      case "${1:-}" in
        set | delete | rm | use | add | remove)
          bloquear "pnpm $sub $1 cambia pnpm, Node o de dónde bajan los paquetes: lo decide una persona." ;;
      esac ;;
    audit) case " $* " in *" --fix "*) bloquear "pnpm audit --fix reescribe las versiones (overrides): lo decide una persona." ;; esac ;;
  esac
  return 0
}

# npm, yarn, bun y deno no agregan ni cambian nada (se agrega con pnpm y sólo lo de la lista); instalar sin paquete pasa. Usa `cmd`
# de revisar_segmento.
revisar_otro_gestor() {
  local i=0 t sub=""
  while [ "$i" -lt "${#A[@]}" ]; do
    t="${A[$i]}"
    case "$t" in
      -g | --global) bloquear "Nada global: contamina la máquina del usuario." ;;
      -*) if es_opcion_con_valor "$t"; then i=$((i + 2)); else i=$((i + 1)); fi ;;
      *) sub="$t"; i=$((i + 1)); break ;;
    esac
  done
  local R=("${A[@]:$i}")
  case "$sub" in
    i | in | ins | inst | insta | instal | install | isnt | isnta | isntal | isntall | it | install-test | cit | install-ci-test)
      hay_posicional "${R[@]}" &&
        bloquear "$cmd $sub <paquete> cambia dependencias: se agrega con pnpm y sólo lo de $LISTA_APROBADA." ;;
    add | a | up | update | udpate | upgrade | upgrade-interactive | uninstall | unlink | un | remove | rm | r | link | ln | \
      dedupe | ddp | global | dlx | patch-commit | workspace | workspaces | plugin | set)
      bloquear "$cmd $sub cambia dependencias: se agrega con pnpm y sólo lo de $LISTA_APROBADA." ;;
    config | c)
      case "${R[0]:-}" in
        set | delete | rm | edit) bloquear "$cmd $sub ${R[0]} cambia de dónde bajan los paquetes (también para pnpm): lo decide una persona." ;;
      esac ;;
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
      # `recursive`, `multi` y `m` son `-r` escrito como subcomando.
      recursive | multi | m) antes="$t"; i=$((i + 1)) ;;
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

# Las opciones de `npx`, `pnpm exec` y `pnpm dlx` antes del comando que corren. `-p`/`--package` llevan su valor (`npx -p pnpm pnpm
# add x`); cualquier otra (`-C`, `--filter`, `-r`…) puede dejarlo en otra carpeta. Cambia W y OTRA_CARPETA de revisar_segmento.
quitar_opciones_de_ejecutar() {
  while [ "${#W[@]}" -gt 0 ] && [[ "${W[0]}" == -* ]]; do
    case "${W[0]}" in
      -p | --package) W=("${W[@]:2}") ;;
      -y | --yes) W=("${W[@]:1}") ;;
      *)
        OTRA_CARPETA=1
        if es_opcion_con_valor "${W[0]}"; then W=("${W[@]:2}"); else W=("${W[@]:1}"); fi ;;
    esac
  done
}

# Las opciones de `sudo` y `env` antes del comando, también juntas (`-iC dir`, `-DE`, `-C/tmp`): C, D o R lo dejan en otra carpeta,
# y si la última letra lleva valor, el valor va aparte. Cambia W y OTRA_CARPETA de revisar_segmento.
quitar_opciones_de_sudo_o_env() {
  local o
  while [ "${#W[@]}" -gt 0 ] && [[ "${W[0]}" == -* ]]; do
    o="${W[0]}"
    case "$o" in
      --chdir=* | --chroot=*) OTRA_CARPETA=1; W=("${W[@]:1}") ;;
      --chdir | --chroot) OTRA_CARPETA=1; W=("${W[@]:2}") ;;
      --unset | --user | --group) W=("${W[@]:2}") ;;
      --*) W=("${W[@]:1}") ;;
      *)
        [[ "$o" == *[CDR]* ]] && OTRA_CARPETA=1
        if [[ "$o" =~ ^-[A-Za-z]*[CDRughprtTU]$ ]]; then W=("${W[@]:2}"); else W=("${W[@]:1}"); fi ;;
    esac
  done
}

# Una orden de pnpm que cambia dependencias metida en otro comando (`find -exec`, `watch`, `echo … | bash`, un mensaje, un grep):
# el hook no ve cómo corre y la bloquea igual (mejor sobrar que faltar). `$P add` cuenta: pnpm puede estar en la variable.
pnpm_metido() {
  local t visto=""
  for t in "$@"; do
    if [ -n "$visto" ]; then
      case "$t" in
        add | up | update | upgrade | remove | rm | uninstall | un | link | ln)
          bloquear "«$visto $t» dentro de otro comando: el hook no ve cómo corre. Córrelo solo; para buscarlo, busca «dependencia»." ;;
      esac
    fi
    case "${t##*/}" in pnpm | pnpm@* | \$*) visto="$t" ;; esac
  done
  return 0
}
