// Pantalla: La ficha de un vehículo (`/vehiculos/[id]`, en dos columnas): cabecera (con la tira y la vitrina), datos principales (con la ficha completa), costo y subasta (la cuenta del cierre, la puja, la compra directa y el costo estimado), el modal de las fechas de la subasta, el bloque «Vitrina», limpieza y los paneles. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`): reexporta lo que esa pantalla dibuja y nada más.
export { AvisoDeLimpieza } from '../features/limpieza/components/aviso-de-limpieza'
export { AvisoDeSituacion } from '../features/situacion/components/aviso-de-situacion'
export { PanelDeFechasDeSubasta } from '../features/subasta/components/panel-de-fechas-de-subasta'
export {
  CostoYSubasta,
  EsqueletoDeCostoYSubasta,
} from '../features/ficha/components/costo-y-subasta'
export { CabeceraDeVehiculo } from '../features/ficha/components/cabecera-de-vehiculo'
export { BotonDeVitrinaDeLaFicha } from '../features/vitrina/components/boton-de-vitrina-de-la-ficha'
export { InsigniaDeVitrina } from '../features/vitrina/components/insignia-de-vitrina'
export { MenuDeVehiculoDeLaFicha } from '../features/acciones/components/menu-de-vehiculo-de-la-ficha'
export { PanelDeVehiculo } from '../features/alta/components/panel-de-vehiculo'
export { PanelDeVitrina } from '../features/vitrina/components/panel-de-vitrina'
export { BloqueDeVitrina } from '../features/vitrina/components/bloque-de-vitrina'
export { DatosPrincipalesDelVehiculo } from '../features/ficha/components/datos-principales-del-vehiculo'
export { PanelesDelMenuDeLaFicha } from '../features/acciones/components/paneles-del-menu-de-la-ficha'
