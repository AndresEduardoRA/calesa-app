// Pantalla del área `proyectos` de `repuestos`: el formulario «Nuevo proyecto» de `/repuestos`. Sólo lo importa la composición que `src/app` pide con `diferido()` al
// abrirlo (`src/app/(app)/repuestos/nuevo-proyecto-abierto.tsx`): el listado no paga en frío el formulario, los buscadores ni supabase-js.
export { DrawerDeNuevoProyecto } from '../features/proyectos/components/drawer-de-nuevo-proyecto'
export type { BuscadorDeProyecto } from '../features/proyectos/components/tipos-del-buscador'
export type { LectorDelLeadDelVehiculo } from '../features/proyectos/hooks/use-cliente-del-vehiculo'
export type { LeadDeLaUrl } from '../features/proyectos/hooks/use-lead-del-alta'
export { CLAVE_DE_LEAD_DEL_PROYECTO } from '../entities/proyectos/paneles'
