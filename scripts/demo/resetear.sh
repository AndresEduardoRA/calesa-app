#!/usr/bin/env bash
# Resetea la demo (el proyecto de Supabase enlazado) con las migraciones del árbol, y comprueba que quedó como el repo:
#   1. respalda el esquema y los datos en respaldos/<fecha>/ (ignorado por git, permisos 600);
#   2. `supabase db reset --linked --no-seed` y las semillas de `[db.seed]` (config.toml), una por una;
#   3. el dueño: la cuenta de `DEMO_DUENO_EMAIL` con `DEMO_DUENO_CLAVE`, su perfil y el rol dueño (`sql-del-dueno.sh`);
#   4. pone `url_proyecto` en Vault (la usan los jobs que llaman a una función edge);
#   5. comprueba: `migration list` alineado, `db diff --linked` vacío, los jobs en `cron.job` y la colación de la base.
#
#   bash scripts/demo/resetear.sh [--sin-respaldo]
#
# La demo no tiene datos reales y se puede resetear; lo corre la persona o una sesión (docs/DESPLIEGUE.md › «La base remota»).
# Lee `.env.demo`: `DEMO_DUENO_EMAIL` y `DEMO_DUENO_CLAVE` (obligatorias: sin ellas no resetea) y `DEMO_SUPABASE_URL` (si no,
# https://<ref>.supabase.co). Ningún valor secreto se imprime.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
sb() { pnpm exec supabase "$@" 2> >(grep -v -i -E 'new version|recommend updating|^We recommend' >&2); }

REF=$(cat supabase/.temp/project-ref 2>/dev/null || true)
[ -n "$REF" ] || { echo "✗ no hay proyecto enlazado: \`supabase link\` lo hace la persona." >&2; exit 64; }
# shellcheck disable=SC1091
if [ -f .env.demo ]; then set -a; . ./.env.demo; set +a; fi
URL="${DEMO_SUPABASE_URL:-https://${REF}.supabase.co}"
URL="${URL%/}"
[[ "$URL" =~ ^https://[a-z0-9.-]+$ ]] || { echo "✗ DEMO_SUPABASE_URL no es una URL https sin ruta: «$URL»" >&2; exit 64; }
echo "demo: $REF ($URL)"

# El SQL del dueño antes de borrar nada: si faltan sus credenciales, no se resetea.
SQL=$(mktemp)
DUENO=$(mktemp)
trap 'rm -f "$SQL" "$DUENO"' EXIT
chmod 600 "$DUENO"
bash scripts/demo/sql-del-dueno.sh >"$DUENO"

# 1. Respaldo
if [ "${1:-}" != --sin-respaldo ]; then
  DIR="respaldos/$(TZ=America/La_Paz date +%F_%H%M%S)"
  mkdir -p "$DIR" && chmod 700 respaldos "$DIR"
  sb db dump --linked -f "$DIR/esquema.sql" >/dev/null
  sb db dump --linked --data-only --use-copy -f "$DIR/datos.sql" >/dev/null
  chmod 600 "$DIR"/*
  echo "✓ respaldo en $DIR ($(du -sh "$DIR" | cut -f1))"
fi

# Corre un archivo SQL en el remoto; si falla, muestra el error de la base y corta.
consulta() {
  local salida
  if ! salida=$(pnpm exec supabase db query --linked -f "$1" 2>&1); then
    printf '✗ %s:\n%s\n' "$2" "$(printf '%s' "$salida" | grep -v -i -E 'new version|recommend|login role' | tail -5)" >&2
    exit 1
  fi
}

# 2. Reset, sin el seed de la CLI: con --linked no siembra (visto con la 2.120). Las semillas van después, una por una.
sb db reset --linked --yes --no-seed
echo "✓ reset con $(find supabase/migrations -name '*.sql' | wc -l | tr -d ' ') migraciones"
SEMILLAS=$(sed -n '/^\[db\.seed\]/,/^\[/{/sql_paths/,/\]/p}' supabase/config.toml | grep -oE '"[^"]+\.sql"' | tr -d '"')
[ -n "$SEMILLAS" ] || { echo "✗ no encontré [db.seed] sql_paths en supabase/config.toml" >&2; exit 1; }
for s in $SEMILLAS; do consulta "supabase/${s#./}" "la semilla $s"; done
# shellcheck disable=SC2086 # una semilla por palabra
echo "✓ semillas: $(printf '%s ' $SEMILLAS)"

# 3. El dueño
consulta "$DUENO" "crear al dueño"
echo "✓ dueño: $(printf '%s' "$DEMO_DUENO_EMAIL" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"

# 4. La URL del proyecto en Vault
cat > "$SQL" <<SQL
do \$\$
declare v_id uuid;
begin
  select s.id into v_id from vault.secrets s where s.name = 'url_proyecto';
  if v_id is null then
    perform vault.create_secret('$URL', 'url_proyecto', 'URL del proyecto para los jobs que llaman a funciones edge');
  else
    perform vault.update_secret(v_id, '$URL');
  end if;
end \$\$;
SQL
sb db query --linked -f "$SQL" >/dev/null
echo "✓ url_proyecto en Vault"

# 5. Comprobaciones
fallo=0
desalineadas=$(sb migration list --linked --output-format json | jq -r '.migrations[] | select(.local != .remote) | "\(.local) ≠ \(.remote)"')
if [ -z "$desalineadas" ]; then echo "✓ migration list: alineado"; else echo "✗ migration list desalineado:"; echo "$desalineadas"; fallo=1; fi
diff_salida=$(bash scripts/candado.sh db:diff -- pnpm exec supabase db diff --linked 2>&1 | grep -v -i -E 'new version|recommend' || true)
# La CLI nueva responde JSON. Los triggers de Storage que llaman a funciones de `storage` son de Supabase (la nube corre una versión
# más nueva que la pila local), no de las migraciones: no cuentan.
diff_json=$(printf '%s\n' "$diff_salida" | grep -E '^\{"diff"' | tail -1 || true)
if [ -n "$diff_json" ]; then
  propio=$(printf '%s' "$diff_json" | jq -r '.diff' | grep -v -E '^\s*$|^CREATE TRIGGER [a-z_]+ .* ON storage\.[a-z_]+ .*EXECUTE FUNCTION storage\.' || true)
elif printf '%s' "$diff_salida" | grep -q -i 'no schema changes found'; then
  propio=""
else
  propio="$diff_salida"
fi
if [ -z "$propio" ]; then echo "✓ db diff --linked: vacío (sin contar lo interno de Storage)"
else echo "✗ db diff --linked no está vacío:"; printf '%s\n' "$propio" | tail -20; fallo=1; fi
jobs=$(sb db query --linked --output-format json "select jobname from cron.job order by 1" | jq -r '.. | .jobname? // empty' | paste -sd ' ')
esperados=$(grep -hoE "cron\.schedule\('[a-z-]+'" supabase/migrations/*.sql | sed -E "s/.*'([a-z-]+)'/\1/" | sort -u | paste -sd ' ')
if [ "$jobs" = "$esperados" ]; then echo "✓ cron.job: $jobs"; else echo "✗ cron.job tiene «$jobs» y las migraciones programan «$esperados»"; fallo=1; fi
colacion=$(sb db query --linked --output-format json "select datcollate, datctype, datlocprovider::text as proveedor, coalesce(datlocale, '') as locale from pg_database where datname = current_database()" | jq -c '..|objects|select(has("datcollate"))' | head -1)
echo "· colación de la demo: $colacion (local: $(docker exec "$(node --input-type=module -e "import { stackLocal } from './scripts/lib/stack-local.mjs'; console.log(stackLocal().contenedorDb)")" psql -U postgres -d postgres -XAt -c "select json_build_object('datcollate', datcollate, 'datctype', datctype, 'proveedor', datlocprovider::text, 'locale', coalesce(datlocale, ''))::text from pg_database where datname = current_database()" 2>/dev/null || echo '?'))"
exit $fallo
