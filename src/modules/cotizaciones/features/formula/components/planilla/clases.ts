// Las clases de la tabla de la planilla de la fórmula: las columnas # y A van pegadas a la izquierda (con fondo propio) al desplazarse de costado, en el celular y con
// el texto al 200 %; D se parte en líneas y nunca se corta.
export const COLUMNAS = 5
export const CELDA = 'border-b border-(--color-line) px-2 py-1.5 align-middle'
export const NUMERO = `${CELDA} sticky left-0 z-10 w-10 bg-(--color-surface) text-right font-mono text-(length:--text-xs) text-(--color-ink-faint) tabular-nums`
export const CONCEPTO = `${CELDA} sticky left-10 z-10 min-w-48 border-r bg-(--color-surface) text-left font-normal`
export const PORCENTAJE = `${CELDA} w-28 text-right tabular-nums`
export const VALOR = `${CELDA} w-40 text-right tabular-nums`
export const DE_DONDE_SALE = `${CELDA} min-w-56 text-(--color-ink-soft) break-words`
