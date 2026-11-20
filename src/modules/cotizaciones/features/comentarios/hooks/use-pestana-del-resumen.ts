'use client'

import { parseAsString, useQueryState } from 'nuqs'
import {
  CLAVE_DE_PESTANA_DEL_RESUMEN,
  pestanaDelResumenDeCotizacion,
  type PestanaDelResumenDeCotizacion,
} from '../../../entities/pestanas-del-resumen'

// La pestaña abierta del resumen de una cotización, en la URL (`?pestana=`): sobrevive a recargar y se puede compartir. Cambiar de pestaña no suma al historial (así «atrás» cierra el
// resumen), «De este vehículo» (`?pestana=vehiculo`) sólo existe con vehículo (sin él, abre «Todo») y «Todo» es la de siempre: no escribe nada. Abrir y cerrar el resumen la borran (`useResumenDeCotizacion`).
export function usePestanaDelResumen({ conVehiculo }: { conVehiculo: boolean }) {
  const [valor, escribir] = useQueryState(CLAVE_DE_PESTANA_DEL_RESUMEN, parseAsString)
  return {
    pestana: pestanaDelResumenDeCotizacion(valor, { conVehiculo }),
    elegir: (pestana: PestanaDelResumenDeCotizacion) => {
      void escribir(pestana === 'todo' ? null : pestana)
    },
  }
}
