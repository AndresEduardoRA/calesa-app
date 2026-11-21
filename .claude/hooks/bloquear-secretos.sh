# shellcheck shell=bash
# Los secretos de GitHub en el hook de Bash: lo carga `bloquear-peligrosos.sh` (que pone `bloquear` y `CMD`) y se prueba con él
# (`scripts/guardas/bloquear-secretos.casos.ts`). Una sesión del orquestador corre con el token de la app en GH_TOKEN y con la clave
# de la app en la máquina (scripts/orquestador/README.md › «Como la app de GitHub»): ni la clave se lee ni el token se imprime, porque
# lo que sale por la terminal queda en el transcript. gh y git push ya lo usan solos. Como el resto del hook, lee texto: mejor sobrar.

MSJ_CLAVE="La clave de la app no se lee ni se imprime."
MSJ_TOKEN="El token de GitHub no se imprime: gh y git push ya lo usan solos (scripts/orquestador/README.md › «Como la app de GitHub»)."

# Sobre el comando entero.
revisar_secretos() {
  local sin
  # La carpeta de la clave (salvo maquina.env, la configuración de turnos de la máquina), la clave y su variable.
  sin=${CMD//.config\/orquestador\/maquina.env/}
  case "$sin" in
    *app.pem* | *".config/orquestador/"* | *APP_CLAVE*) bloquear "$MSJ_CLAVE" ;;
  esac
  # La caché del token de la app (token-app.sh: `<caché>/orquestador/app-<instalación>`); las carpetas de tareas
  # (`orquestador/<proyecto>/…`) no.
  case "$CMD" in
    *'$GH_TOKEN'* | *'${GH_TOKEN'* | *'$GITHUB_TOKEN'* | *'${GITHUB_TOKEN'* | *printenv* | *"/environ"* | *"orquestador/app-"*)
      bloquear "$MSJ_TOKEN" ;;
  esac
  # `GH_TOKEN=$(gh auth token --user <dueña>) gh …` usa el token sin mostrarlo (contratos.md): se quita antes de buscar.
  # Las opciones globales van antes del subcomando (`gh -R x auth token`): entre `gh` y `auth` cabe cualquier cosa del segmento.
  sin=$(printf '%s' "$CMD" | sed -E 's/GH_TOKEN=\$\(gh[[:space:]]+auth[[:space:]]+token[^)]*\)//g')
  if printf '%s' "$sin" | grep -qE 'gh([[:space:]]+[^;&|[:space:]]+)*[[:space:]]+auth[[:space:]]+(token|git-credential)' ||
    printf '%s' "$CMD" | grep -qE 'gh[[:space:]]+auth[[:space:]]+status[^;&|]*([[:space:]]-[a-zA-Z]*t([[:space:]]|$)|--show-token)' ||
    printf '%s' "$CMD" | grep -qE 'git[[:space:]]+(-[^[:space:]]+[[:space:]]+)*credential'; then
    bloquear "$MSJ_TOKEN"
  fi
  return 0
}

# Por segmento, con sus palabras sin comillas ni redirecciones: lo que imprime todo el entorno y correr el guion del token.
revisar_secretos_del_segmento() {
  local W=("$@") cab t i solo=1
  [ "${#W[@]}" -gt 0 ] || return 0
  cab=${W[0]##*/}
  case "$cab" in
    env)
      # Sin un comando detrás (sólo opciones o asignaciones), `env` imprime el entorno.
      for t in "${W[@]:1}"; do
        case "$t" in -* | [A-Za-z_]*=*) ;; *) solo=0 && break ;; esac
      done
      [ "$solo" = 1 ] && bloquear "$MSJ_TOKEN" ;;
    export | declare | typeset)
      for t in "${W[@]:1}"; do case "$t" in -*) ;; *) solo=0 ;; esac; done
      [ "$solo" = 1 ] && bloquear "$MSJ_TOKEN" ;;
    set) [ "${#W[@]}" = 1 ] && bloquear "$MSJ_TOKEN" ;;
  esac
  # Correr token-app.sh imprime el token; nombrarlo (git add, cat, un test) no.
  for ((i = 0; i < ${#W[@]}; i++)); do
    [[ "${W[$i]}" == *token-app.sh ]] || continue
    [ "$i" = 0 ] && bloquear "$MSJ_TOKEN"
    case "$cab" in bash | sh | zsh | source | . | exec | env | timeout | nohup | setsid | command | xargs | sudo | eval) bloquear "$MSJ_TOKEN" ;; esac
  done
  return 0
}
