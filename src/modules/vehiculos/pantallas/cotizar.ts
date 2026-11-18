// Pantalla: la barra del vehículo sobre la hoja de cotizar (`/cotizaciones/nuevo` y la cabecera de una guardada, `/cotizaciones/[id]`; las compone `app/`: `cotizaciones` no importa `vehiculos`). Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`): reexporta lo que esa pantalla dibuja y nada más.
export {
  BarraDelVehiculo,
  type ModoDeLaBarra,
} from '../features/panel-para-cotizar/components/barra-del-vehiculo'
export { PANEL_DEL_VEHICULO } from '../features/panel-para-cotizar/claves'
export { AvisoDeSubastaCerradaDiferido as AvisoDeSubastaCerrada } from '../features/panel-para-cotizar/components/diferidos'
export type { AltaDelPanel } from '../features/panel-para-cotizar/alta-del-panel'
export type { ParaElegir } from '../entities/dato-para-elegir'
