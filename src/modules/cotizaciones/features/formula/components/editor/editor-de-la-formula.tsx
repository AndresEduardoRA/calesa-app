'use client'

import type { ReactNode } from 'react'
import { Button } from '@/shared/ui/button'

type Props = {
  nombreDelOrigen: string
  // «Sobre el borrador de <persona>.» o «Sobre la versión N publicada.»
  sobre: string
  alVolver: () => void
  // La lectura de la versión (esqueleto, error, ya no está) o sus filas.
  children: ReactNode
}

// El marco del Modo avanzado (el editor de la fórmula en texto, `?panel=editar-formula`): su título, sobre qué versión se edita y «Volver a la planilla». Lo que
// va adentro lo pone la sesión (`SesionDeLaFormula`), que lee la versión y tiene la fórmula de trabajo.
export function EditorDeLaFormula({ nombreDelOrigen, sobre, alVolver, children }: Props) {
  return (
    <section aria-label="Editor de la fórmula" className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid min-w-0 gap-0.5">
          <h3 className="font-semibold text-(--color-ink)">
            Editar la fórmula de {nombreDelOrigen}
          </h3>
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">{sobre}</p>
        </div>
        <Button type="button" variant="outline" className="min-h-11 md:min-h-9" onClick={alVolver}>
          Volver a la planilla
        </Button>
      </div>
      {children}
    </section>
  )
}
