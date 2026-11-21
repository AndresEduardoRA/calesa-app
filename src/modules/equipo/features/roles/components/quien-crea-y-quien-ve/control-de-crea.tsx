'use client'

import { useId } from 'react'
import { Switch } from '@/shared/ui/switch'
import type { RolDelCuadro } from './tipos'

type Props = RolDelCuadro & { alCambiar: (crea: boolean) => void }

// «Crea»: `cotizaciones.crear` en el lugar elegido. Sólo lectura, el valor en texto.
export function ControlDeCrea({ rol, fila, ocupado, alCambiar }: Props) {
  const id = useId()
  const { crea } = fila.celda
  if (fila.sinCambiar) {
    return <span className="text-(length:--text-sm) text-(--color-ink)">{crea ? 'Sí' : 'No'}</span>
  }
  return (
    <div className="grid justify-items-start gap-1">
      <div className="flex min-h-11 items-center md:min-h-8">
        <Switch
          aria-label={`Crea: ${rol.nombre}`}
          aria-describedby={fila.motivoDeCrea ? id : undefined}
          checked={crea}
          disabled={ocupado || fila.motivoDeCrea !== null}
          onCheckedChange={alCambiar}
        />
      </div>
      {fila.motivoDeCrea ? (
        <p id={id} className="max-w-56 text-(length:--text-xs) text-(--color-ink-faint)">
          {fila.motivoDeCrea}
        </p>
      ) : null}
    </div>
  )
}
