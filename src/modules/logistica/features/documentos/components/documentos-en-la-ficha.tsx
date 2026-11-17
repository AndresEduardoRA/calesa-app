'use client'

import type { ReactNode } from 'react'
import { irAlBloque } from '@/shared/ui/ficha-en-bloques/ir-al-bloque'
import {
  ATRIBUTO_DEL_BLOQUE,
  useAlPedirAbrirElHueco,
} from '../../nucleo/hooks/eventos-de-la-unidad'

// El bloque «Documentos» de la ficha del vehículo como hueco de la unidad: el marcador existe desde el primer dibujo (aunque el bloque espere a acercarse para
// montar su lista), así que «Subir» y «Revisar» de «Qué falta» lo encuentran; al pedirlo, la página salta al bloque, que se monta y recibe el foco.
export function DocumentosEnLaFicha({ ancla, children }: { ancla: string; children: ReactNode }) {
  useAlPedirAbrirElHueco('documentos', () => {
    irAlBloque(ancla)
  })
  return (
    <div {...{ [ATRIBUTO_DEL_BLOQUE]: 'documentos' }} className="contents">
      {children}
    </div>
  )
}
