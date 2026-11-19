// Las clases de la celda. El botón del valor y la entrada que lo reemplaza comparten CAJA: mismo tamaño, relleno, letra y alto de línea,
// así abrir la edición no mueve nada. Los colores salen de `--tono-*` (lo escribe `<EstiloDeTonos>`) y, sin tono, de los tokens neutros.
export const TINTA = 'text-[color:var(--tono-tinta,var(--color-ink))]'

// 44 px EN PX con el dedo (no `size-11`, que es rem y crece con el texto), y compacto sólo con puntero fino desde 768 px.
const BLANCO_TACTIL = 'min-h-[44px] md:pointer-fine:min-h-8'

// El relleno y la separación de las filas los puede pisar quien la contiene (una sección «compacta» de la hoja) con `--xcell-relleno` y
// `--xcell-separacion`; sin ellas, los de siempre (8 y 6 px). El blanco táctil no cambia. Una fila, como la XCell de V1: rótulo · valor(es) · acciones; lo que no
// cabe baja de línea (el valor antes de encimarse con el rótulo). El color del grupo va en borde y fondo (`--tono-*`). Deshabilitada (todos los lados bloqueados: otra
// variante, condición apagada, un nivel), gris con su monto: fondo apagado y tinta suave de los tokens, que pasan AA (`design/tokens.test.ts`), en vez de su tono.
export const RAIZ =
  'flex flex-wrap items-center justify-end gap-x-2 gap-y-[var(--xcell-separacion,calc(var(--spacing)*1.5))] rounded-md border p-[var(--xcell-relleno,calc(var(--spacing)*2))] text-sm border-[color:var(--tono-borde,var(--color-line-strong))] bg-[color:var(--tono-fondo,var(--color-surface))] data-[estado~=deshabilitado]:border-dashed data-[estado~=deshabilitado]:[--tono-fondo:var(--color-surface-2)] data-[estado~=deshabilitado]:[--tono-borde:var(--color-line-strong)] data-[estado~=deshabilitado]:[--tono-tinta:var(--color-ink-soft)] ' +
  TINTA

// El rótulo toma lo que queda (desde 6 rem) y, si no alcanza, se corta con «…»: el texto completo va en `title` (y es el nombre del grupo para el lector). Como crece,
// lo de su fila queda a la derecha; en una fila de abajo, `justify-end` de la raíz lleva los valores y las acciones a la derecha, juntos.
export const ETIQUETA = 'min-w-0 grow basis-24 truncate py-1 font-medium'
// Las acciones, detrás del valor. Se separan 8 px, como los valores: el contorno del foco de una ocupa 4 y no toca a la vecina.
export const ACCIONES = 'flex shrink-0 items-center gap-2'

// El valor, en la monoespaciada de los tokens (`--font-mono`) con cifras tabulares: nunca se corta (no se parte ni se achica) y, si no cabe junto al rótulo, baja a su
// fila a la derecha. La entrada que lo reemplaza toma el ancho medido del botón (`LadoDeXCell`).
const CAJA_SIN_BORDE = `${BLANCO_TACTIL} block min-w-[6rem] shrink-0 rounded-sm text-right font-mono text-sm leading-5 whitespace-nowrap tabular-nums`
export const CAJA = `${CAJA_SIN_BORDE} border-0 px-2 py-1`
// El lado bloqueado de un par cuyo otro lado se edita (4.13-3c, P3): su caja lleva el borde discontinuo que, con la celda entera bloqueada, lleva la celda. El relleno
// pierde el píxel del borde: la caja mide lo mismo que la del otro lado.
const CAJA_DISCONTINUA = `${CAJA_SIN_BORDE} border border-dashed border-[color:var(--tono-borde,var(--color-line-strong))] px-[7px] py-[3px]`

// El foco es un contorno EXTERIOR, en el `-ink` del color primario (≥ 3:1 sobre la superficie en claro y en oscuro; el primario a secas da 2,8:1 en oscuro);
// el «modificado» es un anillo INTERIOR en la tinta: no se confunden y se ven a la vez. Los controles de una celda se separan 8 px: el contorno ocupa 4.
export const FOCO =
  'outline-offset-2 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-(--color-primario-ink)'

const BOTON_SIN_TINTA = `${FOCO} cursor-text bg-transparent hover:bg-black/5 dark:hover:bg-white/10 group-data-[estado~=modificado]/xc:ring-2 group-data-[estado~=modificado]/xc:ring-inset group-data-[estado~=modificado]/xc:ring-[color:var(--tono-tinta,var(--color-ink))] aria-disabled:cursor-not-allowed`
const BOTON = `${BOTON_SIN_TINTA} ${TINTA}`
export const BOTON_DEL_VALOR = `${CAJA} ${BOTON} font-semibold`
export const BOTON_DEL_LADO_BLOQUEADO = `${CAJA_DISCONTINUA} ${BOTON} font-semibold`
// El porcentaje de un par, como en V1: chico, de peso normal y gris al lado del monto. Sin tono, la tinta suave; con tono, la tinta del tono (un gris sobre un fondo de
// color no garantiza AA).
const TINTA_DEL_PORCENTAJE = 'text-[color:var(--tono-tinta,var(--color-ink-soft))]'
export const BOTON_DEL_PORCENTAJE = `${CAJA} ${BOTON_SIN_TINTA} ${TINTA_DEL_PORCENTAJE} text-xs font-normal`
export const BOTON_DEL_PORCENTAJE_BLOQUEADO = `${CAJA_DISCONTINUA} ${BOTON_SIN_TINTA} ${TINTA_DEL_PORCENTAJE} text-xs font-normal`

// Transparente, sin borde propio ni el fondo de `<Input>` (que trae `dark:bg-input/30` y `aria-invalid:border-destructive`).
export const ENTRADA = `${CAJA} ${FOCO} ${TINTA} bg-transparent`

export const BOTON_DE_ACCION = `${BLANCO_TACTIL} inline-flex min-w-[44px] md:pointer-fine:min-w-8 items-center justify-center rounded-sm ${FOCO} ${TINTA} hover:bg-black/5 dark:hover:bg-white/10`

export const PUNTO = 'size-2 shrink-0 rounded-full bg-[color:var(--tono-tinta,var(--color-ink))]'

export const NOTA = `flex min-w-0 basis-full items-start gap-1 text-xs [overflow-wrap:anywhere] ${TINTA}`
