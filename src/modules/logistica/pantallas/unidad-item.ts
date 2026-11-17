// Lo que el núcleo de `logistica` dibuja en el panel de un ítem de repuesto (8.13-2): el hueco «Transporte», que sólo dice que sigue al vehículo, y el panel con sus
// secciones a la vista (`PanelDeLaUnidadALaVista`, con `?destino=` y los bloques de `repuestos`). Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
export { HuecoDeTransporteDeItem } from '../features/nucleo/components/hueco-de-transporte-de-item'
export { PanelDeLaUnidadALaVista } from '../features/nucleo/components/panel-de-la-unidad-a-la-vista'
export type { SeccionDeLaUnidad } from '../features/nucleo/components/contenido-del-hueco'
