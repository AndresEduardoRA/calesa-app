// Adónde llega quien abre el editor de una fórmula del origen desde otro lugar (el rechazo de «Activar»): la fila de la planilla que se elige al abrirla
// (`…/planilla?fila=<id del nodo>`) y el lugar de la tarjeta al que se va (`…/tarjeta?lugar=celdas.<id>`). La planilla y la tarjeta los leen una vez y los borran.
// En el núcleo: los escribe el área `formulas-del-origen` y los leen `formula` y `plantilla`.
export const CLAVE_DE_LA_FILA_PEDIDA = 'fila'
export const CLAVE_DEL_LUGAR_PEDIDO = 'lugar'
