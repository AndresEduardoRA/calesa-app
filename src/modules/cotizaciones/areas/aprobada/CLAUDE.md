# cotizaciones › aprobada

El área `aprobada` de `cotizaciones`: la cotización aprobada de cada vehículo. Ficha del módulo: `../../CLAUDE.md` › «Áreas». Dominio y reglas:
`docs/COTIZADOR.md` › «La cotización aprobada».

## Qué es

Cada vehículo tiene a lo sumo una cotización **aprobada** (`cotizaciones_aprobadas`, una fila por vehículo con el primer resultado congelado). Nace aprobada la
primera activa; quien aprueba en el origen (`cotizaciones.aprobar`) elige otra; si la aprobada se invalida o va a la papelera la releva la más antigua activa.
No es la **Final**. `client.ts` vacío; `index.ts` sólo lleva las lecturas por página que unen las pantallas de `src/app`; la composición del navegador
(`composicion.client.ts`, la lectura de «De este vehículo») la importa sólo su hook.

## En la pantalla

- **La guardada** (`pantallas/aprobada-cotizacion.ts` → `HUECOS_DE_APROBADA_EN_LA_GUARDADA.Insignias`, antes de las insignias de `comentarios`):
  `aprobada-de-la-guardada.tsx` (Server Component tras `<Suspense fallback={null}>`) lee `leerMarcaDeLaGuardada()` (`cotizaciones` con el embebido por el único de
  `cotizaciones_aprobadas`, `cache()`). Todos los que ven la cotización ven la insignia «Aprobada» (`insignia-aprobada.tsx`: un `<span>` con `badgeVariants`, sin
  `<Badge>` de Base UI); quien tiene la clave en el origen ve «Aprobar» (`boton-aprobar.tsx`, una isla que al entrar pasa a la insignia). Sin vehículo, inválida o
  sin la lectura de la marca, el botón queda apagado con su motivo (`motivoParaNoAprobar`, `aria-describedby`); sin lectura nunca se inventa una marca.
- **No hay `<Confirmar>`:** aprobar es reversible. `aprobarLaCotizacion()` (función, no hook; sin `useAction`: el JS en frío de la guardada está al tope) llama a la
  action, aplica lo devuelto con `alCambiar` y avisa con «Deshacer» 10 s si llegó `anterior` (aprueba la anterior con su versión). **La action no revalida ni
  refresca** (`.claude/rules/acciones.md`: remontaría lo tipeado en la hoja).
- Errores: el texto de la base (PT409 con quién y cuándo + «Recargar», 42501, 22023, 23514); sin red, «Sin conexión: no se aprobó…»; inesperado tras llegar,
  «No sabemos si se aprobó: recarga para verlo.» + «Recargar». Ninguna cifra en un `aria-label` ni en un `title`.
- **Las lecturas por página** (`leerAprobadasDeVehiculos(ids)` para `/vehiculos`, `leerAprobadasDeCotizaciones(ids)` para el listado): una consulta por clave
  primaria o por el único, de ≤ 100 ids, con `.limit(ids.length)`; sin ids no consultan. El monto cruza como texto (`monto::text`).

- **De este vehículo** (`features/aprobada/components/de-este-vehiculo/`): en la guardada, la línea bajo la cabecera (`BajoLaCabecera`) y la sección bajo la
  hoja (`Debajo`), Server Components tras `<Suspense>` que leen `leerOtrasDelVehiculo()` (las otras del vehículo con `limit 101` por PostgREST, `cache()`:
  la comparten); sin otras, sin vehículo visible o si falla, nada. La lista es una isla que pide su código y su primera página al acercarse
  (`al-acercarse.tsx` → `diferidos.tsx`) y lee desde el navegador por `composicion.client.ts` (`cotizaciones_de_este_vehiculo`, de a 10 hasta 100;
  `useDeEsteVehiculo`, con `ultimo` como único guardián). En el resumen del listado entra por `pantallas/aprobada-resumen.ts` (sólo la cáscara) con
  `conTitulo`. La aprobada va primero (`filasALaVista()`: la fijada, sin repetir), «Esta» la que se mira, y **«Aprobar esta»** en las demás: el servidor manda
  dónde aprueba quien mira (`aprobarEn`, de `origenesCon`) y `motivoParaNoAprobarEsta()` da el motivo (el permiso del origen y después inválida, como la base).
  Aprobar usa `aprobarLaCotizacion()` (su `alCambiar` recibe además el id que quedó aprobado); tras entrar o deshacer el bloque relee su primera página y
  avisa a las otras islas del vehículo (`hooks/aprobada-del-vehiculo.ts`: `avisarAprobada()`, `useAlCambiarLaAprobada()`), así «Aprobar» de la cabecera se
  pone al día sin refrescar la hoja. `pantallas/aprobada-de-este-vehiculo.ts` presta la isla a otra pantalla (la ficha del vehículo).

- **El listado** (`pantallas/aprobada-listado.ts`): «Aprobar» del «⋯» de cada fila llama a `aprobarLaCotizacion()` con la versión de la página; el listado no tiene lo
  tipeado de una hoja, así que `alCambiar` refresca la página (la anterior aprobada del vehículo deja de serlo). No se ofrece en la que ya es la aprobada.

## En la base

`cotizacion_aprobar(id, versión)` y el mantenimiento al confirmar: `docs/COTIZADOR.md`. La lectura del bloque, `cotizaciones_de_este_vehiculo()` (invocadora) con
`_nombre_del_modo()` (`security definer`, el nombre del modo a quien tiene `cotizaciones.ver` del origen). Pruebas: `supabase/tests/areas/aprobada/` (`de-este-vehiculo.sql`
para el bloque), `scripts/carreras/cotizaciones-aprobada.mjs`, `supabase/tests/medir-cotizaciones-aprobadas.sql` y `medir-cotizaciones-de-este-vehiculo.sql`.
