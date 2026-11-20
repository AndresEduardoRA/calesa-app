// Pantalla: Configuración › Orígenes › un origen, el marco de su página (la tira «Para cotizar y mover» y el «⋯» del encabezado). Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`): reexporta lo que esa pantalla dibuja y nada más.
export {
  ParaCotizarYMover,
  type PasoDeLaTira,
} from '../features/pasos/components/para-cotizar-y-mover'
export { MenuDelOrigen } from '../features/origenes/components/menu-del-origen'
