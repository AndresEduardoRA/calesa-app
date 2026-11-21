'use client'

import { Trash2Icon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import {
  OPCION_NUEVA,
  type OpcionEnBorrador,
} from '../../../../../entities/formula/opciones-de-la-variante'

type Props = {
  uid: string
  opciones: readonly OpcionEnBorrador[]
  alCambiar: (opciones: readonly OpcionEnBorrador[]) => void
}

// Las opciones de una variante: etiqueta (lo que elige el asesor) y título (lo que dice la tarjeta; vacío, la etiqueta). Siempre quedan dos.
export function OpcionesDeLaVariante({ uid, opciones, alCambiar }: Props) {
  const cambiar = (i: number, cambio: Partial<OpcionEnBorrador>) => {
    alCambiar(opciones.map((o, j) => (j === i ? { ...o, ...cambio } : o)))
  }
  return (
    <fieldset className="grid min-w-0 gap-3">
      <legend className="mb-1 font-medium text-(--color-ink)">Opciones</legend>
      <ol className="grid min-w-0 gap-3">
        {opciones.map((o, i) => (
          <li
            // Una opción en borrador no tiene otro id: los campos son controlados.
            key={i}
            className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-2"
          >
            <div className="grid min-w-0 gap-2 sm:grid-cols-2">
              <Campo
                nombre={`${uid}-etiqueta-${String(i)}`}
                etiqueta={`Opción ${String(i + 1)}`}
                maxLength={60}
                value={o.etiqueta}
                onChange={(e) => {
                  cambiar(i, { etiqueta: e.target.value })
                }}
              />
              <Campo
                nombre={`${uid}-titulo-${String(i)}`}
                etiqueta="Título en la tarjeta"
                maxLength={120}
                placeholder={o.etiqueta}
                value={o.titulo}
                onChange={(e) => {
                  cambiar(i, { titulo: e.target.value })
                }}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-[44px] md:size-[36px]"
              aria-label={`Quitar la opción ${String(i + 1)}`}
              disabled={opciones.length <= 2}
              onClick={() => {
                alCambiar(opciones.filter((_, j) => j !== i))
              }}
            >
              <Trash2Icon aria-hidden className="size-4" />
            </Button>
          </li>
        ))}
      </ol>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 justify-self-start md:min-h-9"
        onClick={() => {
          alCambiar([...opciones, OPCION_NUEVA])
        }}
      >
        Sumar una opción
      </Button>
    </fieldset>
  )
}
