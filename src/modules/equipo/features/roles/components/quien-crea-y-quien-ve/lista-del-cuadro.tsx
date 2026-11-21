'use client'

import { RoleBadge } from '../role-badge'
import { ControlDeCrea } from './control-de-crea'
import { ControlDeVe } from './control-de-ve'
import type { AlCambiarDelCuadro, RolDelCuadro } from './tipos'

type Props = { filas: readonly RolDelCuadro[]; alCambiar: AlCambiarDelCuadro }

// El cuadro por debajo de 768 px: un renglón por rol dentro de la misma tarjeta (sin tarjetas adentro), con «Crea» y «Ve» que se parten si no caben.
export function ListaDelCuadro({ filas, alCambiar }: Props) {
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)]">
      {filas.map((fila) => (
        <li
          key={fila.rol.id}
          className="grid min-w-0 gap-2 border-b border-(--color-line) px-3 py-3 last:border-b-0"
        >
          <RoleBadge rol={fila.rol} className="justify-self-start" />
          {fila.motivo ? (
            <p className="text-(length:--text-xs) text-(--color-ink-faint)">{fila.motivo}</p>
          ) : null}
          <div className="flex min-w-0 flex-wrap items-start gap-x-4 gap-y-2">
            <div className="grid gap-1">
              <span className="text-(length:--text-xs) font-medium text-(--color-ink-faint)">
                Crea
              </span>
              <ControlDeCrea
                {...fila}
                alCambiar={(crea) => {
                  alCambiar(fila.rol, { crea })
                }}
              />
            </div>
            <div className="grid min-w-0 flex-1 basis-48 gap-1">
              <span className="text-(length:--text-xs) font-medium text-(--color-ink-faint)">
                Ve
              </span>
              <ControlDeVe
                {...fila}
                alCambiar={(ve) => {
                  alCambiar(fila.rol, { ve })
                }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
