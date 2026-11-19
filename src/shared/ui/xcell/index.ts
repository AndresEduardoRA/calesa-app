// La celda de la hoja de cotizar (4.12) y lo que la acompaña: los tonos de la empresa y los iconos, que se montan una vez por hoja.
export { XCell, type XCellProps } from './xcell'
export { EstiloDeTonos } from './estilo-de-tonos'
export { SimbolosDeXCell } from './simbolos-de-xcell'
export type { FormatoDeXCell } from './estado'
export type { Tono } from './tonos'
// El estilo de lo editable (el botón del valor y la entrada que lo reemplaza, con el color de `--tono-*`): la fuente única para otra superficie que marca sus
// celdas editables como la XCell (la planilla de la fórmula).
export { BOTON_DEL_VALOR, ENTRADA } from './clases'
