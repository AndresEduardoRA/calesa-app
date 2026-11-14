'use client'

import { PestanasDelResumen } from '@/shared/ui/lista'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  PESTANAS_DEL_RESUMEN_DE_COTIZACION,
  type PestanaDelResumenDeCotizacion,
} from '../../../../entities/pestanas-del-resumen'
import type { PropsDeLasPestanasDelResumen } from '../../../hoja/components/huecos-del-resumen'
import { usePestanaDelResumen } from '../../hooks/use-pestana-del-resumen'
import {
  AdjuntosDelResumenDiferido,
  ComentariosDelResumenDiferido,
  RevisionesDelResumenDiferido,
  TodoDelResumenDiferido,
} from './diferidos'

// Las pestañas del resumen de una cotización (`?pestana=`): «Todo» (adjuntos, revisiones y comentarios en una línea de tiempo) y cada uno por separado. Sólo se dibuja la elegida y cada
// una lee lo suyo al elegirse (`diferido()`), por cursor y con tope. Mientras el resumen se cierra (`?pestana=` ya se borró) se queda en la que estaba, sin leer otra.
export function PestanasDeLaCotizacion({
  cotizacion,
  puedeAdjuntar,
  puedeModerar,
  abierto,
  Comprobantes,
}: PropsDeLasPestanasDelResumen) {
  const url = usePestanaDelResumen()
  const mostrada =
    useUltimo<PestanaDelResumenDeCotizacion>(abierto ? url.pestana : null) ?? url.pestana
  return (
    <PestanasDelResumen
      etiqueta="Secciones de la cotización"
      pestanas={PESTANAS_DEL_RESUMEN_DE_COTIZACION}
      activa={mostrada}
      alElegir={url.elegir}
    >
      {/* `key`: con otra cotización abierta, cada pestaña lee la suya. */}
      {mostrada === 'adjuntos' ? (
        <AdjuntosDelResumenDiferido
          key={cotizacion.id}
          cotizacionId={cotizacion.id}
          clase={cotizacion.clase}
          puedeAdjuntar={puedeAdjuntar}
          puedeModerar={puedeModerar}
          Comprobantes={Comprobantes}
        />
      ) : mostrada === 'revisiones' ? (
        <RevisionesDelResumenDiferido key={cotizacion.id} cotizacionId={cotizacion.id} />
      ) : mostrada === 'comentarios' ? (
        <ComentariosDelResumenDiferido
          key={cotizacion.id}
          cotizacionId={cotizacion.id}
          puedeAdjuntar={puedeAdjuntar}
        />
      ) : (
        <TodoDelResumenDiferido
          key={cotizacion.id}
          cotizacionId={cotizacion.id}
          puedeAdjuntar={puedeAdjuntar}
          alElegirPestana={url.elegir}
        />
      )}
    </PestanasDelResumen>
  )
}
