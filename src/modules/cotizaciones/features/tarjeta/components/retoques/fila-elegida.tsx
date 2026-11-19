'use client'

import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { FilaDelModo } from '../../../../entities/tarjeta/retoques/modo-de-la-tarjeta'

type Props = {
  fila: FilaDelModo
  // Por qué no se retoca la celda que se tocó para elegirla (un dato, el logo); nulo si se eligió desde su control.
  motivo: string | null
  error: string | null
  enCurso: boolean
  alAlternar: (id: string) => void
}

// La fila elegida, bajo la tarjeta: su rótulo y «Ocultar fila» o «Mostrar fila» a 44 px (el control equivalente para las bandas de menos de 24 px).
export function FilaElegida({ fila, motivo, error, enCurso, alAlternar }: Props) {
  return (
    <div
      data-fila-elegida={fila.id}
      className="flex flex-wrap items-center gap-2 rounded-(--radius-md) border border-(--color-border) p-2"
    >
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className="text-(length:--text-sm) font-medium break-words">Fila «{fila.rotulo}»</p>
        {motivo === null ? null : (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">{motivo}</p>
        )}
      </div>
      <Button
        variant="outline"
        disabled={enCurso}
        className="min-h-[44px] max-sm:flex-1"
        onClick={() => {
          alAlternar(fila.id)
        }}
      >
        {fila.oculta ? <EyeIcon aria-hidden /> : <EyeOffIcon aria-hidden />}
        {fila.oculta ? 'Mostrar fila' : 'Ocultar fila'}
      </Button>
      {error === null ? null : (
        <p role="alert" className="basis-full text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      )}
    </div>
  )
}
