// Los eventos de la cuadrícula van delegados en la tabla (uno por tipo, no uno por celda: la planilla dibuja hasta 500 filas). Puro sobre el DOM del evento.
import type { SyntheticEvent } from 'react'
import { filaDe, type HojaDeLaPlanilla } from '../../../../../entities/formula/hoja-de-la-planilla'
import type { DestinoDeMover } from '../../../../../entities/formula/mover-fila'
import {
  COLUMNAS_DE_LA_PLANILLA,
  type ColumnaDeLaPlanilla,
} from '../../../../../entities/formula/texto-de-la-celda'
import type { SobreLaFila } from '../../../hooks/use-arrastre-de-fila'
import type { CeldaActiva } from '../../../hooks/use-cuadricula'
import type { OperacionesDeFila } from '../../../hooks/use-operaciones-de-fila'

const esColumna = (col: string | undefined): col is ColumnaDeLaPlanilla =>
  COLUMNAS_DE_LA_PLANILLA.some((c) => c === col)

// Lo que se toca dentro de una celda y no es la celda: el «⋯», un enlace, la entrada que se escribe.
const PROPIO = 'button, a, input, textarea'

// La celda del evento (por `data-col` y la fila por `data-fila`), o nula si fue en algo propio de adentro o fuera de toda celda (un menú abierto en un portal).
export function celdaDelEvento(e: SyntheticEvent): CeldaActiva | null {
  const t = e.target
  if (!(t instanceof Element) || t.closest(PROPIO) !== null) return null
  const td = t.closest<HTMLElement>('[data-col]')
  const id = td?.closest<HTMLElement>('tr[data-fila]')?.dataset['fila']
  const col = td?.dataset['col']
  return id === undefined || !esColumna(col) ? null : { id, col }
}

// Con una celda en edición, apretar otra no se lleva el foco de la entrada (el clic nombra esa celda en lo que se escribe).
export function retenerElFoco(e: SyntheticEvent, editando: boolean) {
  const t = e.target
  if (editando && t instanceof Element && t.closest('input, textarea') === null) e.preventDefault()
}

// Soltar una fila arrastrada: antes o después de la otra y, si esa está en otra banda (o en ninguna), ahí.
export function soltarFila(
  hoja: HojaDeLaPlanilla,
  ops: OperacionesDeFila,
  id: string,
  sobre: SobreLaFila,
) {
  const n = hoja.numeroDe.get(id)
  const m = hoja.numeroDe.get(sobre.id)
  if (n === undefined || m === undefined) return
  const destino: DestinoDeMover = sobre.lado === 'antes' ? { antesDe: m } : { despuesDe: m }
  const grupo = filaDe(hoja, m)?.grupo ?? null
  if (grupo === (filaDe(hoja, n)?.grupo ?? null)) ops.mover(n, destino)
  else ops.moverABanda(n, destino, grupo)
}
