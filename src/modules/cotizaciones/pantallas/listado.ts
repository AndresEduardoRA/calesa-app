// Pantalla: el listado de cotizaciones (`/cotizaciones`). Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`): reexporta lo que esa pantalla dibuja y nada más.
// La lista única del «⋯» de una fila sale por acá y no por `client.ts` de la raíz: ese barril trae el JS de la hoja, que `/cotizaciones` no paga.
export { ListadoDeCotizaciones } from '../features/listado/components/listado-de-cotizaciones'
export {
  ETIQUETA_DE_ACCION_DE_COTIZACION,
  ETIQUETA_DE_REPORTAR_SI_YA_REPORTO,
  accionesDeCotizacion,
  type ClaveDeAccionDeCotizacion,
} from '../entities/acciones-de-cotizacion'
export type { MenuDeUnaFila } from '../entities/listado/acciones-de-cotizacion'
export type { QuienDelResumen } from '../features/hoja/components/huecos-del-resumen'
export type { CompartirDe, HuecosDeLaLista, MenuDeFila } from '../features/listado/components/tipos'
// «Hacer privada» / «Hacer pública» del «⋯» de cada fila (glosario: «Cotización privada»), del núcleo: la misma de la guardada.
export { cambiarLaPrivada } from '../features/privada/hooks/cambiar-la-privada'
