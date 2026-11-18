import type { ReactNode } from 'react'
import { queEsElItem } from '../../../entities/items/que-es'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import type { ContextoDeLaHoja } from './contexto-de-la-hoja'

type Celdas = { tipoDePieza: ReactNode; condicion: ReactNode; descripcion: ReactNode }

// La primera columna de la hoja: qué es el ítem. De lectura, «Bomba de agua · Usado» y debajo la descripción (sin tipo ni condición, la descripción sola). Editable,
// las mismas celdas de siempre: el tipo de pieza y la condición en una fila que se parte y, debajo, la descripción.
export function QueEsElItem({
  fila,
  contexto,
  celdas,
}: {
  fila: FilaDeItem
  contexto: ContextoDeLaHoja
  celdas: Celdas
}) {
  if (contexto.editable) {
    return (
      <div className="grid min-w-0 gap-1.5">
        <div className="flex min-w-0 flex-wrap gap-1.5 [&>*]:min-w-32 [&>*]:flex-1">
          {celdas.tipoDePieza}
          {celdas.condicion}
        </div>
        {celdas.descripcion}
      </div>
    )
  }
  const queEs = queEsElItem(fila, contexto.catalogos)
  return (
    <div className="grid min-w-0 gap-0.5 whitespace-normal">
      {queEs === null ? null : (
        <span className="font-medium [overflow-wrap:anywhere]">{queEs}</span>
      )}
      <span
        className={
          queEs === null
            ? 'font-medium [overflow-wrap:anywhere]'
            : '[overflow-wrap:anywhere] text-(--color-ink-soft)'
        }
      >
        {fila.descripcion}
      </span>
    </div>
  )
}
