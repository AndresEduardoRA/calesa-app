'use client'

import type { ComponentType } from 'react'
import type {
  ClaseDelResumen,
  PropsDeLosComprobantesDelResumen,
} from '../../../hoja/components/huecos-del-resumen'
import { Adjuntos } from '../adjuntos'

type Props = {
  cotizacionId: string
  clase: ClaseDelResumen
  puedeAdjuntar: boolean
  puedeModerar: boolean
  // Lo que el área `comprobantes` suma bajo los archivos.
  Comprobantes?: ComponentType<PropsDeLosComprobantesDelResumen>
}

// «Adjuntos» del resumen: los archivos de la cotización con la misma zona de subida, descarga y «Quitar» de la guardada, y bajo ellos los comprobantes que ya tenga (de sólo lectura:
// emitir y anular son de la guardada). Se lee al abrir la pestaña.
export function AdjuntosDelResumen({
  cotizacionId,
  clase,
  puedeAdjuntar,
  puedeModerar,
  Comprobantes,
}: Props) {
  return (
    <div className="grid min-w-0 gap-4">
      <Adjuntos cotizacionId={cotizacionId} quien={{ puedeAdjuntar, puedeModerar }} />
      {Comprobantes === undefined ? null : (
        <Comprobantes cotizacionId={cotizacionId} clase={clase} />
      )}
    </div>
  )
}
