// Los esqueletos de `/agenda` (sólo `src/app`): los de su `loading.tsx` y el `<Suspense>` de los pendientes. Aparte de `pantallas/agenda.ts` para que el
// esqueleto de la ruta no arrastre los componentes de cliente de la pantalla (el calendario, la columna) a otro grupo de chunks.
export { EsqueletoDeCalendario } from '../features/calendario/components/esqueleto-de-calendario'
export { EsqueletoDePendientes } from '../features/pendientes/components/esqueleto-de-pendientes'
