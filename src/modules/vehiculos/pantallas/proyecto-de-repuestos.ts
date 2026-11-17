// Pantalla: el lead por defecto de «Nuevo proyecto» de `/repuestos` cuando sale de un vehículo (lo compone `app/`: `repuestos` no importa `vehiculos`). Sólo
// `src/app` importa este archivo (`.claude/rules/modulos.md`), desde la composición que se pide con `diferido()` al abrir el formulario.
export { leerLeadVinculado } from '../features/vinculo/hooks/leer-lead-vinculado'
export type { LeadVinculado } from '../entities/vinculo'
