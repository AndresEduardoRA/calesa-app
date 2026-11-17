#!/usr/bin/env bash
# Deja un worktree (de Orca, de Claude Code o de `git worktree add`) listo para trabajar en paralelo con la principal: un «carril», con
# su propio stack de Supabase y sus puertos (docs/FLUJO.md › «En paralelo»). Idempotente: corre las veces que haga falta. Se corre en
# el worktree, nunca en la principal.
#
#   bash scripts/worktree/preparar.sh [a|b|c]   (sin letra: la que ya tenía este worktree o la primera libre)
#
# 1) `.env.carril`: el project_id `importadora-<carril>` y los puertos con su desfase (scripts/lib/stack-local.mjs: a = +100, b = +200).
#    Lo cargan el candado (`pnpm db:*`, `test:e2e`), `pnpm dev`, `pnpm funciones` y los scripts de medir: config.toml no se toca.
# 2) `pnpm install` si falta. 3) `supabase start` del carril, sin Studio, imgproxy ni logs (como el e2e de CI).
# 4) `.env.local`: lo de Supabase sale de `supabase status`; lo demás, de la `.env.local` de la principal. Nada se imprime.
# 5) La base: `restaurar.sh --local` (reset y datos de demo) si hay credenciales de demo; si no, `pnpm db:reset`. 6) El mapa.
# Quitarlo: scripts/worktree/quitar.sh.
set -euo pipefail
RAIZ=$(git rev-parse --show-toplevel)
cd "$RAIZ"
falta() { echo "✗ $1" >&2; exit 64; }

if [ "$(git rev-parse --path-format=absolute --git-dir)" = "$(git rev-parse --path-format=absolute --git-common-dir)" ]; then
  falta "esto es la principal: preparar.sh va en un worktree (git worktree add, Orca o Claude Code)."
fi
PRINCIPAL=$(git worktree list --porcelain | sed -n '1s/^worktree //p')

CARRIL="${1:-}"
# Sin .env.carril no hay letra (y no es un error: con pipefail, el sed de un archivo que falta haría salir al guion en silencio).
letra_de() { [ -f "$1/.env.carril" ] || return 0; sed -n 's/^SUPABASE_PROJECT_ID=.*-\([a-z]\)$/\1/p' "$1/.env.carril" | head -n 1; }
# Elegir la letra y escribir `.env.carril` va bajo un candado común a todos los worktrees del repo: dos preparar.sh a la vez (el
# orquestador lanza dos tareas en el mismo segundo) verían libre la misma letra y chocarían en `supabase start`.
exec 9>"$(git rev-parse --path-format=absolute --git-common-dir)/carriles.lock"
flock -w 120 9 || falta "otro preparar.sh retiene el candado de los carriles hace más de 2 min."
[ -n "$CARRIL" ] || CARRIL=$(letra_de "$RAIZ")
if [ -z "$CARRIL" ]; then
  usadas=$(git worktree list --porcelain | sed -n 's/^worktree //p' | while IFS= read -r dir; do letra_de "$dir"; done)
  for letra in a b c; do
    grep -qx "$letra" <<<"$usadas" || { CARRIL=$letra; break; }
  done
  [ -n "$CARRIL" ] || falta "los tres carriles (a, b y c) están en uso: quita uno con scripts/worktree/quitar.sh en su worktree."
fi

# 1) .env.carril
node --input-type=module -e "
import { writeFileSync } from 'node:fs'
import { variablesDelCarril, DESFASES_DE_LOS_CARRILES, baseDelRepo, proyectoDelRepo } from './scripts/lib/stack-local.mjs'
// El proyecto y sus puertos salen del manifiesto (.proyecto/proyecto.yaml): la pila de un carril es <nombre del repo>-<letra>.
const v = variablesDelCarril(proyectoDelRepo(), process.argv[1], DESFASES_DE_LOS_CARRILES, baseDelRepo())
const lineas = Object.entries(v).map(([k, x]) => k + '=' + String(x))
writeFileSync('.env.carril', '# Carril ' + process.argv[1] + ': lo escribe scripts/worktree/preparar.sh. No se edita a mano.\n' + lineas.join('\n') + '\n')
" "$CARRIL"
flock -u 9 # con `.env.carril` escrito, la letra ya cuenta como usada para el próximo
# shellcheck source=../lib/carril.sh
source scripts/lib/carril.sh
echo "✓ carril $CARRIL: stack $SUPABASE_PROJECT_ID, API $SUPABASE_API_PORT, base $SUPABASE_DB_PORT, app $PUERTO_APP, e2e $E2E_PORT"

# 2) Dependencias (pnpm las enlaza desde el store: no se bajan de nuevo).
[ -d node_modules ] || pnpm install --frozen-lockfile --prefer-offline >/dev/null
echo "✓ dependencias"

# 3) El stack del carril. Si algo de aquí en adelante falla, se baja el stack y se suelta la letra (lo de quitar.sh): un carril a
# medio preparar dejaba su Supabase arriba y su letra tomada, y el siguiente intento elegía otra.
sb() { pnpm exec supabase "$@" 2> >(grep -v -i -E 'new version|recommend updating|^We recommend' >&2); }
soltar_al_fallar() {
  local codigo=$?
  [ "$codigo" = 0 ] && return 0
  echo "✗ preparar.sh cayó ($codigo): bajo el stack $SUPABASE_PROJECT_ID y suelto el carril $CARRIL." >&2
  pnpm exec supabase stop --no-backup >/dev/null 2>&1 || true
  rm -f .env.carril
}
trap soltar_al_fallar EXIT
if sb status >/dev/null 2>&1; then
  echo "✓ stack $SUPABASE_PROJECT_ID ya estaba arriba"
else
  sb start -x studio,imgproxy,logflare,vector >/dev/null
  echo "✓ stack $SUPABASE_PROJECT_ID arriba"
fi

# 4) .env.local: lo de Supabase de este stack y lo demás de la principal, sin imprimir valores.
estado=$(sb status -o env)
leer() { printf '%s\n' "$estado" | sed -nE "s/^$1=\"?([^\"]*)\"?$/\1/p"; }
PROPIAS='^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|SUPABASE_SECRET_KEY|MAILPIT_URL)='
{
  echo "# Carril $CARRIL: lo escribe scripts/worktree/preparar.sh (lo de Supabase, de su stack; lo demás, de la principal)."
  echo "NEXT_PUBLIC_SUPABASE_URL=$(leer API_URL)"
  echo "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$(leer PUBLISHABLE_KEY)"
  echo "SUPABASE_SECRET_KEY=$(leer SECRET_KEY)"
  echo "MAILPIT_URL=$E2E_MAILPIT_URL"
  if [ -f "$PRINCIPAL/.env.local" ]; then grep -vE "$PROPIAS" "$PRINCIPAL/.env.local" | grep -vE '^# Carril ' || true; fi
} >.env.local.nuevo
chmod 600 .env.local.nuevo
mv .env.local.nuevo .env.local
pnpm --silent env:check local >/dev/null || { pnpm --silent env:check local >&2; falta ".env.local incompleta (arriba, lo que falta)."; }
echo "✓ .env.local"

# 5) La base: con datos de demo si están las tres credenciales que pide restaurar.sh (en .env.demo, que se copia de la principal por
# .worktreeinclude, o en el entorno); si falta alguna, la base sin demo y se dice cuál (no es motivo para no preparar el carril).
faltan_de_demo=$(
  set +u
  # shellcheck disable=SC1091
  if [ -f .env.demo ]; then set -a && . ./.env.demo && set +a; fi
  for v in DEMO_DUENO_EMAIL DEMO_DUENO_CLAVE DEMO_CLAVE_USUARIOS; do [ -n "${!v:-}" ] || printf '%s ' "$v"; done
)
if [ -z "$faltan_de_demo" ]; then
  bash scripts/demo/restaurar.sh --local
else
  pnpm db:reset >/dev/null 2>&1 || pnpm db:reset >/dev/null
  echo "✓ base reseteada (sin datos de demo: falta ${faltan_de_demo% } en .env.demo o en el entorno)"
fi

# 6) El mapa de este árbol.
bash scripts/mapa.sh >/dev/null
echo "✓ mapa"
trap - EXIT
echo
echo "Listo. App: pnpm dev (http://localhost:$PUERTO_APP) · funciones: pnpm funciones · e2e: pnpm test:e2e <spec> (puerto $E2E_PORT)"
