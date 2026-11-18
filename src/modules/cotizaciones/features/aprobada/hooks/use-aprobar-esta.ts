'use client'

import { useState } from 'react'
import type { FilaDeEsteVehiculo } from '../../../entities/aprobada/de-este-vehiculo'
import { aprobarLaCotizacion } from './aprobar-la-cotizacion'
import { avisarAprobada } from './aprobada-del-vehiculo'

// «Aprobar esta» de una fila de «De este vehículo» o de una columna de «Comparar cotizaciones»: un envío a la vez (`enCurso`, la que va) y, al entrar o al deshacer,
// el aviso a las otras islas del vehículo y `alCambiar` con la que quedó aprobada (el bloque relee su primera página; el resumen refresca el listado; comparar mueve
// la insignia).
export function useAprobarEsta(
  vehiculoId: string,
  fuente: string,
  alCambiar: (idAprobada: string) => void,
) {
  const [enCurso, setEnCurso] = useState<string | null>(null)
  const aprobar = (fila: Pick<FilaDeEsteVehiculo, 'id' | 'numero' | 'actualizadoEn'>) => {
    setEnCurso(fila.id)
    void aprobarLaCotizacion({
      id: fila.id,
      numero: fila.numero,
      actualizadoEn: fila.actualizadoEn,
      alCambiar: (_aprobada, idAprobada) => {
        avisarAprobada({ vehiculoId, aprobadaId: idAprobada, fuente })
        alCambiar(idAprobada)
      },
    }).finally(() => {
      setEnCurso(null)
    })
  }
  return { enCurso, aprobar }
}
