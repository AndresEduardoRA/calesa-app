// Lo que dibuja `/agenda` (sólo `src/app`): el calendario (la hoja del día, semana y mes), su esqueleto, la columna de pendientes con el suyo y los paneles de
// evento, tarea y recordatorio. La página lee con `leerAgenda` y `leerPendientes` de `@/modules/agenda`; aquí no hay lecturas.
export { CalendarioDeAgenda } from '../features/calendario/components/calendario-de-agenda'
export { EsqueletoDeCalendario } from '../features/calendario/components/esqueleto-de-calendario'
export { PanelesDeAgenda } from '../features/paneles/components/paneles-de-agenda'
export { ColumnaDePendientes } from '../features/pendientes/components/columna-de-pendientes'
export { EsqueletoDePendientes } from '../features/pendientes/components/esqueleto-de-pendientes'
