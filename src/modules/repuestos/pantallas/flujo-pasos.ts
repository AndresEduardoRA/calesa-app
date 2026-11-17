// Pantalla del área `flujo` de `repuestos`: los pasos del proyecto sobre la hoja de `/repuestos/[id]` y el botón del siguiente de cada ítem. Va aparte de
// `pantallas/flujo.ts` para que la Cadena no pague su JS. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
export { PasosDelProyecto } from '../features/flujo/components/pasos-del-proyecto'
export { PasoDelItem, type HitoDelSiguiente } from '../features/flujo/components/paso-del-item'
export { ID_DEL_PANEL_DEL_PASO } from '../features/flujo/components/boton-del-panel-del-paso'
export { useIndiceDelFlujo } from '../features/flujo/hooks/use-indice-del-flujo'
export type { LecturaDeLosPasos, PanelDelPaso } from '../entities/flujo/pasos-del-flujo'
export type { IndiceDelFlujo } from '../entities/flujo/pasos'
