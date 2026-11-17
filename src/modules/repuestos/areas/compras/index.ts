// La API de servidor de el área `compras` de `repuestos` (8.11): el panel «Compras» de `/repuestos/[id]` la lee `src/app`, y el pago vivo del proyecto (`hayPagoDelCliente`, para los pasos). Sale por el `index.ts` de la raíz.
export { leerComprasDelProyecto } from '../../infra/compras/listar'
export { leerMargenDelProyecto } from '../../infra/compras/margen'
export { TOPE_DE_COMPRAS, type FilaDeCompra } from '../../entities/compras/compra'
export type { MargenDelProyecto } from '../../entities/compras/margen'
export { hayPagoDelCliente } from '../../infra/compras/pago-del-cliente'
export { CLAVE_DE_COMPRA, PANEL_COMPRA } from '../../entities/compras/paneles'
