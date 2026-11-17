# shellcheck shell=bash
# Antes de cerrar la tanda, `main` en verde de punta a punta (README.md › «El cierre de la tanda»): una vez por sha de main dispara
# `ci.yml` por workflow_dispatch con el e2e de escritorio (`e2e=true`, `proyectos=escritorio`) y mira esa corrida en las vueltas
# siguientes. En rojo encola, una vez por sha, la tarea urgente de dejarlo verde (plantillas/main-en-rojo.md, `cierre: verificar`: no
# cuenta como tarea de la tanda); al integrarse, main cambia de sha y la próxima vuelta quieta vuelve a disparar. La corrida en curso,
# en estado/.cierre-run: «<sha> <id | -> <epoch del disparo>». Lo carga orquestador.sh con `source`, después de cierre-tanda.sh; lo
# llama cierre_de_tanda.

# Una corrida disparada que no aparece en la lista en este tiempo se vuelve a disparar (GitHub perdió el dispatch).
CIERRE_BUSCAR_S=3600

enlace_corrida() { # la URL de la corrida de .cierre-run
  local sha id t
  read -r sha id t <"$EST/.cierre-run" 2>/dev/null || true
  echo "https://github.com/$REPO_GH/actions/runs/${id:-}"
}

# 0 main está verde en ese sha; 3 todavía no (recién disparada, en curso o roja); 1 GitHub no respondió.
main_en_verde() { # sha
  local sha=$1 r_sha="" r_id="" r_t="" j
  [ -f "$EST/.cierre-run" ] && read -r r_sha r_id r_t <"$EST/.cierre-run"
  if [ "$r_sha" != "$sha" ]; then
    disparar_ci "$sha"
    return
  fi
  if [ "$r_id" = - ]; then
    r_id=$(buscar_corrida "$sha" "$r_t") || return 1
    if [ -z "$r_id" ]; then
      if [ $(($(date +%s) - ${r_t:-0})) -ge "$CIERRE_BUSCAR_S" ]; then
        rm -f "$EST/.cierre-run"
        log "la verificación de main (${sha:0:7}) no aparece en Actions: la vuelvo a disparar"
      fi
      return 3
    fi
    echo "$sha $r_id $r_t" >"$EST/.cierre-run"
  fi
  j=$(ghc run view "$r_id" --json status,conclusion) || return 1
  [ "$(jq -r .status <<<"$j")" = completed ] || return 3
  [ "$(jq -r .conclusion <<<"$j")" = success ] && return 0
  main_en_rojo "$sha" "$r_id" || return 1
  return 3
}

disparar_ci() { # sha — 3 disparada; 1 GitHub no respondió
  local sha=$1 t id
  ghc workflow run ci.yml --ref main -f e2e=true -f proyectos=escritorio >/dev/null || return 1
  t=$(date +%s)
  id=$(buscar_corrida "$sha" "$t") || id=""
  echo "$sha ${id:--} $t" >"$EST/.cierre-run"
  log "verifico main (${sha:0:7}) antes de cerrar la tanda: e2e de escritorio por workflow_dispatch${id:+ (corrida $id)}"
  avisar "Verifico main antes de cerrar la tanda" "La cola quedó quieta: corre el e2e de escritorio sobre main (${sha:0:7}); en verde, el cierre entra a la cola." low mag
  return 3
}

buscar_corrida() { # sha epoch-del-disparo → el id de la corrida (o nada); 1 si GitHub no respondió
  local salida
  salida=$(ghc run list --workflow ci.yml --event workflow_dispatch --branch main --limit 20 \
    --json databaseId,headSha,createdAt) || return 1
  jq -r --arg sha "$1" --argjson t "${2:-0}" '[.[] | select(.headSha == $sha)
    | select((.createdAt | sub("\\.[0-9]+Z$"; "Z") | fromdateiso8601) >= $t - 120)] | sort_by(.createdAt) | last | .databaseId // empty' \
    <<<"$salida"
}

main_en_rojo() { # sha id — la tarea urgente, una vez por sha; 1 si GitHub no respondió
  local sha=$1 id=$2 f t caidos
  [ "$(cat "$EST/.cierre-rojo" 2>/dev/null)" = "$sha" ] && return 0
  caidos=$(caidos_de "$id")
  f="$EST/main-en-rojo-${sha:0:7}.md"
  t=$(<"$ORQ/plantillas/main-en-rojo.md")
  t=${t//'{{SHA_CORTO}}'/${sha:0:7}}
  t=${t//'{{SHA}}'/$sha}
  t=${t//'{{CORRIDA}}'/https://github.com/$REPO_GH/actions/runs/$id}
  t=${t//'{{ID_CORRIDA}}'/$id}
  printf '%s\n' "${t//'{{CAIDOS}}'/$caidos}" >"$f"
  publicar_entrada "$f" || return 1
  if [ -n "$PUBLICADA" ]; then
    echo "$sha" >"$EST/.cierre-rojo"
    log "$PUBLICADA: main en rojo en ${sha:0:7} (corrida $id): la tarea urgente de dejarlo verde, a la cola; el cierre espera"
    avisar "main en rojo: el cierre de la tanda espera" "El e2e de main (${sha:0:7}) cayó: $PUBLICADA, urgente, en la cola." high warning "$(enlace_issue "$PUBLICADA")"
  elif [ -f "$f.error" ]; then
    echo "$sha" >"$EST/.cierre-rojo"
    log "✗ la tarea de main en rojo no se publica: plantillas/main-en-rojo.md no se lee ($(cat "$f.error"))"
  fi
}

# Los caídos de la corrida, como lista de Markdown: los `caidos.txt` de sus artefactos (como scripts/flujo/noche.mjs) o, si no hay,
# sus jobs caídos.
caidos_de() { # id
  local dir l lista=""
  dir=$(mktemp -d)
  if ghc run download "$1" --pattern 'e2e-bloque-*' --dir "$dir" >/dev/null 2>&1; then
    lista=$(find "$dir" -name caidos.txt -exec cat {} + 2>/dev/null | sed '/^$/d' | sort -u | head -n 20)
  fi
  rm -rf "$dir"
  [ -n "$lista" ] || lista=$(ghc api "repos/{owner}/{repo}/actions/runs/$1/jobs?per_page=100" \
    --jq '.jobs[] | select(.conclusion == "failure" or .conclusion == "cancelled" or .conclusion == "timed_out") | "job «\(.name)»"' 2>/dev/null)
  [ -n "$lista" ] || lista="(la corrida no dejó nombres: mira sus artefactos)"
  while IFS= read -r l; do echo "- $l"; done <<<"$lista"
}
