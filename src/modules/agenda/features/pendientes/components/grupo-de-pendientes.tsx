'use client'

import { useId, useState } from 'react'
import { Button } from '@/shared/ui/button'
import {
  cursorDePendientes,
  TITULO_DEL_GRUPO,
  type GrupoDePendientes,
  type PaginaDePendientes,
} from '../../../entities/pendientes'
import type { BaseDeEnlace } from '../../calendario/enlace-de-panel'
import type { CompletarPendiente } from '../hooks/use-completar-pendiente'
import { MasPendientesDiferido } from './diferidos'
import { FilaDePendiente } from './fila-de-pendiente'

type Props = {
  grupo: GrupoDePendientes
  pagina: PaginaDePendientes
  base: BaseDeEnlace
  ahora: string
  zona: string
  hasta: string
  completar: CompletarPendiente
}

// Un grupo de pendientes: su título, la primera página (llegó del servidor) y, si hay más, «Ver más», que monta lo que sigue desde la última fila.
export function GrupoDePendientes({ grupo, pagina, base, ahora, zona, hasta, completar }: Props) {
  const id = useId()
  const [verMas, setVerMas] = useState(false)
  const desde = cursorDePendientes(pagina.filas)
  return (
    <section aria-labelledby={id} className="grid gap-1">
      <h3 id={id} className="text-(length:--text-sm) font-semibold text-(--color-ink-soft)">
        {TITULO_DEL_GRUPO[grupo]}
      </h3>
      <ul className="grid grid-cols-[minmax(0,1fr)]">
        {pagina.filas.map((pendiente) => (
          <FilaDePendiente
            key={pendiente.id}
            grupo={grupo}
            pendiente={pendiente}
            base={base}
            ahora={ahora}
            zona={zona}
            completar={completar}
          />
        ))}
      </ul>
      {pagina.hayMas && desde ? (
        verMas ? (
          <MasPendientesDiferido
            grupo={grupo}
            desdeEn={desde.en}
            desdeId={desde.id}
            hasta={hasta}
            yaCargadas={pagina.filas.length}
            base={base}
            ahora={ahora}
            zona={zona}
            completar={completar}
          />
        ) : (
          <Button
            variant="outline"
            className="min-h-11 w-fit md:min-h-9"
            onClick={() => {
              setVerMas(true)
            }}
          >
            Ver más
          </Button>
        )
      ) : null}
    </section>
  )
}
