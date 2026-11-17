'use client'

import { ViewportPortal } from '@xyflow/react'
import type { MedidasDelDiagrama } from '../../../../entities/disposicion-del-diagrama'

type Props = { columna: number; altura: number; medidas: MedidasDelDiagrama }

// Mientras se arrastra una fase, dónde cae si se suelta: el lugar de esa columna, punteado.
export function IndicadorDeCaida({ columna, altura, medidas }: Props) {
  return (
    <ViewportPortal>
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-(--radius-card) border-2 border-dashed border-(--color-primario) bg-(--color-primario-soft)"
        style={{
          transform: `translate(${String(medidas.margen + columna * (medidas.ancho + medidas.separacion))}px, ${String(altura)}px)`,
          width: medidas.ancho,
          height: medidas.alto,
        }}
      />
    </ViewportPortal>
  )
}
