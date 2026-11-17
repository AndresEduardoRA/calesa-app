// Composición de «Ver más» de los pendientes en el navegador: aparte de `composicion.client.ts` para que supabase-js viaje sólo con el código
// diferido que lo usa (la columna de pendientes llega del servidor y no lo paga en frío).
export { leerMasPendientes } from './infra/pendientes.client'
