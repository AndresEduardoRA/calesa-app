# cotizaciones › formulas-del-origen

El área `formulas-del-origen` de `cotizaciones`: la pestaña «Fórmulas» de la página del origen (listar, crear, copiar, renombrar, activar, archivar y eliminar
las fórmulas del origen) y la cabeza del editor de cada una. Ficha del módulo: `../../CLAUDE.md` › «Áreas»; el dominio, `docs/COTIZADOR.md` › «Fórmulas del
origen».

## Qué es

Un origen tiene hasta 50 fórmulas sin archivar y a lo sumo una activa, la que se cotiza. La base lo decide todo (`formula_del_origen_crear|renombrar|archivar|
eliminar|activar`): el permiso (`cotizaciones.configurar` del origen y, al copiar de otro, también de ese), el nombre, el tope, la versión esperada y qué
tarjeta sirve. Acá se lee, se dibuja y se pide.

## Entradas

- `index.ts` (servidor): `leerFormulasDelOrigen(origenId)`, las no archivadas (tope 50, `hayMas`) con sus piezas de hoy (el borrador y la publicada de
  `formulas` y de `plantillas_tarjeta`, leídas en una segunda consulta por `formula_del_origen_id`) y `hayArchivadas`; `leerLaFormulaDelOrigen(origenId, id)`
  (con `cache()`), la fórmula del editor con la activa del origen, nula si no es de ese origen o no se ve.
- `composicion.client.ts` (navegador; sólo su feature): `leerArchivadas(origenId, cursor)` (de a `TAMANO_DE_VER_MAS` por `(archivada_en desc, id desc)`, hasta
  `TOPE_DE_LO_CARGADO`) y `leerFormulasParaCopiar(origenId, copiaId)` (las no archivadas del origen elegido y, si se pidió, la archivada que se copia).
- `composicion.ts` (servidor): `formulasDelOrigenSupabase`, el repositorio de las cinco RPC, que usan las actions de `features/formulas-del-origen/actions/`.
  Cada action pide `puede(ctx.permisos, 'cotizaciones.configurar', origenId)` antes de llamar y **no revalida**: la pantalla vuelve a leer con
  `router.refresh()` (crear abre la planilla nueva).
- `client.ts` vacío. Las pantallas: `pantallas/formulas-del-origen.ts` (`SeccionDeLasFormulas`, recibe el origen, los orígenes y los permisos de `src/app`) y
  `pantallas/formulas-del-origen-cabeza.ts` (`CabezaDeLaFormulaDelOrigen`).

## La pantalla

- La lista: la activa primero (★) y las demás por nombre (`ordenDeLaLista()`), el estado en un `<Badge>` (`estadoDeLaFormula()`), «Editar» y el «⋯»
  (`menuDeLaFormulaDelOrigen()`, el mismo en la cabeza del editor). «Archivadas», plegada, se lee al abrirse.
- Los paneles van por la URL (`entities/formulas-del-origen/rutas.ts`) y se montan una vez por pantalla (`usePanelesDeLaFormula()`): `?panel=nueva-formula`
  (`&copia=<id>` desde «Copiar»), `renombrar-formula`, `activar-formula`, `archivar-formula` y `eliminar-formula` (`&formula=<id>`). Uno que nombra una fórmula
  que no está en lo leído no se abre (`useRevisionAlAbrir()`).
- «Nueva fórmula» crea con un id por apertura; los avisos de la copia (`avisos-de-la-copia.ts`) quedan en `sessionStorage` (`claveDeLosAvisos(id)`) para la
  planilla. «Activar» manda las ocho esperadas que se vieron (`esperadasDeActivar()`); un rechazo con `hint` ofrece ir al lugar
  (`destinoDelRechazoDeActivar()`). Eliminar una ya usada (23503) ofrece «Archivar».

## No se rompe

- Lo que otorga la activa se escribe sólo por RPC; ningún `.update()` sobre `formulas_del_origen`.
- Las esperadas viajan como el texto de la base, nunca por `Date`.
- Ningún área importa ésta: lo que la página del origen necesita sale por sus entradas.
