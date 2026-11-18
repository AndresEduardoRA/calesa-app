---
# El cierre de una tanda: lo crea solo el orquestador (cierre_de_tanda en cierre-tanda.sh) con la etiqueta `cierre` cuando la cola
# quedó quieta tras una tanda y main salió verde de punta a punta. Reemplaza las llaves FECHA y RAMA_FECHA (AAAA-MM-DD, La Paz), SHA
# (el main verde), CORRIDA (su corrida), TAREAS (las tareas de la tanda) y RESUMEN (resumen-tanda.mjs); en estos comentarios van sin
# llaves: TAREAS y RESUMEN son de varias líneas y romperían el frontmatter. `cierre: tanda`: no cuenta como tarea de la tanda y, al
# integrarse, la tanda siguiente cuenta desde ahí y se podan los transcriptos de ésta.
titulo: cerrar la tanda del {{FECHA}}
rama: chore/cerrar-tanda-{{RAMA_FECHA}}
conflicto: flujo docs
nivel: capaz
effort: high
cierre: tanda
---

## Pedido de la persona

«Que cada vez que se termine una tanda de actualizaciones se haga sola la limpieza y la retro que hice a mano: aplastar los docs,
sacar lo que sobra, encontrar las falencias de la tanda y arreglarlas, para que el flujo mejore con cada vuelta.» Esta tarea la abrió
solo el orquestador (`scripts/orquestador/README.md` › «El cierre de la tanda»).

## Objetivo

Los docs de `main` aplastados y sin historia, nada de la tanda que sobre fuera de su lugar, y las falencias de la tanda convertidas en
mejoras del flujo (hasta tres issues), en lecciones o en pendientes, cada una con su evidencia.

## Decisiones ya tomadas

En este orden; cada paso tiene su criterio de terminado.

1. **Main verde.** `main` salió verde en `{{SHA}}` ({{CORRIDA}}). Antes de empezar, `bash scripts/flujo/estado.sh`: un PR abierto en
   rojo o una noche caída van primero (dilo en el PR; si no es de esta tarea, `RESULTADO: TRABADA —` con lo que viste).
2. **Docs aplastados** (en este PR): `docs/PENDIENTES.md` verificado contra el código (se borra lo cerrado, se junta lo repetido);
   `docs/DECISIONES.md` con una viñeta por decisión vigente, sin historia ni números de tarea; `docs/LECCIONES.md` sin duplicadas;
   `docs/UX.md`, `docs/GLOSARIO.md` y `docs/RENDIMIENTO.md` sin contradicciones con lo integrado; `docs/ESTADO.md` al día (60 líneas
   como máximo). Terminado: ningún doc cuenta historia (`docs/FLUJO.md` › «Docs: qué se toca en cada actualización»).
3. **Lo que sobra fuera de main:** las capturas o informes de la tanda en `docs/referencias/` salen del repo (un informe vive en el
   cuerpo de su PR: antes de borrarlo, que los enlaces de ese cuerpo apunten al sha del commit y no a la rama, con
   `gh api -X PATCH repos/{owner}/{repo}/pulls/<n> -F body=@<archivo>`); los archivos huérfanos que dejó la tanda; las ramas remotas
   integradas (`node scripts/flujo/limpiar-ramas.mjs`). Terminado: `docs/referencias/` sólo tiene referencias vigentes.
4. **Migraciones:** con más de 40 en `supabase/migrations/`, no se aplastan aquí: abre un issue `cola` con la spec de «aplastar las
   migraciones» (`pnpm db:aplastar`, `docs/FLUJO.md` › «La base»; ojo con las pruebas de migraciones de datos que el propio
   `scripts/db/aplastar.sh` pide borrar), con `cierre: mejora`. Con 40 o menos, nada.
5. **Retro con datos** (el resumen va abajo, más los PR de la tanda: `gh pr view <n> --comments`): las falencias que costaron tiempo,
   tokens o corrección, cada una con su evidencia (tarea, PR, minutos o dólares).
   - Cada falencia del **flujo** (orquestador, prompts, plantillas, CI, hooks, guardas, skills) con un arreglo claro: un issue nuevo
     `cola`, **tres como máximo**, ordenados por impacto, con el formato de `scripts/orquestador/plantilla-tarea.md` en el bloque
     ```yaml que pide la cola (sin `borrador`), con `cierre: mejora` y `conflicto: flujo`. Lo que no entra en tres, una línea en
     `docs/PENDIENTES.md`.
   - Cada trampa que volvería a pasar, una línea en `docs/LECCIONES.md` (terminada en `(kit)` si es del flujo: así sube al kit).
   - Lo del producto (un e2e inestable, un tope de rendimiento al borde) va a `docs/PENDIENTES.md`, o como issue normal si urge.
6. **El PR** (`docs(docs): cerrar la tanda del {{FECHA}}`): su cuerpo lleva `## Retro` (lo encontrado, con evidencia, y los issues
   abiertos) y la lista de tareas de la tanda. Nada de `src/` ni `supabase/` en este PR.

## Anclajes

`docs/PENDIENTES.md`, `docs/DECISIONES.md`, `docs/LECCIONES.md`, `docs/ESTADO.md`, `docs/UX.md`, `docs/GLOSARIO.md`,
`docs/RENDIMIENTO.md`, `docs/referencias/`, `docs/FLUJO.md`, `scripts/orquestador/plantilla-tarea.md`, `scripts/flujo/limpiar-ramas.mjs`.

## Estados no felices

Una falencia sin arreglo claro → una línea en PENDIENTES, no un issue · más de tres mejoras → las de menos impacto a PENDIENTES · un
informe cuyo PR no se puede editar → se deja el archivo y se dice en el PR · nada que aplastar ni retro que hacer → igual se publica el
PR con la `## Retro` que lo dice.

## Verificación

`pnpm lint`, `pnpm typecheck`, `pnpm test` y `bash scripts/mapa.sh --check` (que revisa también los enlaces entre docs).

## Tareas de la tanda

{{TAREAS}}

## Resumen de la tanda

{{RESUMEN}}
