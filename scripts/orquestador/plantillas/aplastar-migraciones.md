---
# El aplastado de las migraciones de cada cierre de tanda: lo encola solo el orquestador (encolar_aplastado en cierre-tanda.sh) antes
# del cierre, cuando main tiene más de una migración; el cierre depende de esta tarea. Reemplaza las llaves FECHA y RAMA_FECHA
# (AAAA-MM-DD, La Paz) y MIGRACIONES (cuántas hay). `cierre: aplastar`: no cuenta como tarea de la tanda.
titulo: aplastar las migraciones en una base nueva ({{FECHA}})
rama: chore/aplastar-migraciones-{{RAMA_FECHA}}
conflicto: db
nivel: normal
effort: high
cierre: aplastar
---

## Pedido de la persona

«Que cada tanda termine como la limpieza que hice a mano, con aplastamiento de migrations y todo.» Esta tarea la abrió solo el
orquestador al cerrar la tanda (`scripts/orquestador/README.md` › «El cierre de la tanda»).

## Objetivo

`supabase/migrations/` con una sola base nueva en lugar de las {{MIGRACIONES}} migraciones de hoy, la base local idéntica a la de
antes, y el CI en verde. Nada del producto cambia.

## Decisiones ya tomadas

1. **Aplastar** en el carril: `pnpm db:aplastar` (`scripts/db/aplastar.sh`). Compara la huella completa de la base antes y después
   (esquema, ACL, policies, triggers, catálogo, jobs, buckets, Vault, Realtime). Si no es idéntica, restaura todo y sale con 1:
   `RESULTADO: TRABADA —` con la diferencia que mostró. Nunca se edita la base a mano para que coincida.
2. **Lo que el aplastado deja suelto**, en este mismo PR:
   - Las rutas de migraciones viejas que citen pruebas, guiones o docs: `git grep '<versión de la base anterior>'` y la de cada
     migración borrada (lo dice el «Sigue:» de `aplastar.sh`).
   - Las pruebas de una migración de datos (las entradas con `migracionPorContenido` en `scripts/probar-schema.mjs`): se borran con su
     entrada, como pide su propio archivo.
   - Las pruebas que leen una definición del texto de las migraciones con una expresión (`migracionesEnOrden()`): la base aplastada la
     escribe como el volcado de Postgres (por ejemplo `CONSTRAINT "x_check" CHECK (("col" = ANY (ARRAY['a'::"text", …])))` en vez de
     `check (col in ('a', …))`). Se adapta la prueba para leer las dos formas y quedarse con la última; nunca se cambia la base.
   - `docs/ESTADO.md` › «Verdes»: el nombre de la base nueva.
3. **Verificar todo, no sólo lo relacionado** (el volcado cambia la forma de texto que leen pruebas de cualquier módulo): `pnpm db:reset`,
   `pnpm db:types` (sin diff), `pnpm db:probar` completo, `pnpm db:lint`, `pnpm test` entero, `pnpm lint`, `pnpm typecheck` y
   `bash scripts/mapa.sh --check`.
4. **El PR:** `chore(db): aplastar las migraciones en una base nueva`. El cuerpo dice cuántas se aplastaron, la huella idéntica, qué
   pruebas se adaptaron o borraron, y «Tras integrar» (`docs/DESPLIEGUE.md` › «Tras aplastar las migraciones»: la demo se alinea
   sola; producción, si ya existe, la alinea la persona). El CI corre el e2e completo porque toca migraciones.

## Anclajes

`scripts/db/aplastar.sh`, `scripts/probar-schema.mjs`, `scripts/lib/definicion-sql.ts`, `scripts/guardas/orden-de-migraciones.test.ts`,
`docs/FLUJO.md` › «La base», `docs/DESPLIEGUE.md` › «Tras aplastar las migraciones», `.claude/rules/migraciones.md`.

## Estados no felices

Huella distinta → TRABADA con la diferencia · una migración nueva entró en main mientras tanto → `git merge origin/main` y se vuelve a
aplastar · una prueba que sólo pasa cambiando la base → TRABADA con la prueba y el porqué.

## Verificación

La del paso 3, en el carril.
