// Lo que dibuja `/agenda` (sólo `src/app`): el calendario (la hoja del día, semana y mes), la columna de pendientes y los paneles de evento, tarea y
// recordatorio; los esqueletos, en `pantallas/agenda-esqueletos.ts`. La página lee con `leerAgenda` y `leerPendientes` de `@/modules/agenda`; aquí no hay lecturas.
export { CalendarioDeAgenda } from '../features/calendario/components/calendario-de-agenda'
export { PanelesDeAgenda } from '../features/paneles/components/paneles-de-agenda'
export { ColumnaDePendientes } from '../features/pendientes/components/columna-de-pendientes'
