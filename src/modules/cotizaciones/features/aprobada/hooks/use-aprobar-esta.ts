'use client'

import { useState } from 'react'
import type { DesdeDondeSeAprueba } from '../../../entities/aprobada/url'
import type { FilaDeEsteVehiculo } from '../../../entities/aprobada/de-este-vehiculo'
import { aprobarLaCotizacion, type PedidoDeAprobar } from './aprobar-la-cotizacion'
import { avisarAprobada } from './aprobada-del-vehiculo'
import { useAprobarPrivadaPorUrl } from './use-aprobar-privada-por-url'

type Aprobable = Pick<FilaDeEsteVehiculo, 'id' | 'numero' | 'actualizadoEn'>

// «Aprobar esta» de una fila de «De este vehículo», de una tarjeta de la ficha del vehículo o de una columna de «Comparar cotizaciones»: un envío a la vez (`enCurso`, la que va) y, al entrar o al deshacer,
// el aviso a las otras islas del vehículo y `alCambiar` con la que quedó aprobada (el bloque relee su primera página; el resumen refresca el listado; comparar mueve
// la insignia). Una privada (la base lo dice, con la marca al día) abre la pregunta de `desde`, que la pantalla monta con `pedidoDe`.
export function useAprobarEsta(
  vehiculoId: string,
  fuente: string,
  alCambiar: (idAprobada: string) => void,
  desde: Extract<DesdeDondeSeAprueba, 'vehiculo' | 'ficha' | 'comparar'>,
) {
  const [enCurso, setEnCurso] = useState<string | null>(null)
  const pregunta = useAprobarPrivadaPorUrl(desde)
  const pedidoDe = (fila: Aprobable): Omit<PedidoDeAprobar, 'alSerPrivada'> => ({
    id: fila.id,
    numero: fila.numero,
    actualizadoEn: fila.actualizadoEn,
    alCambiar: (_aprobada, idAprobada) => {
      avisarAprobada({ vehiculoId, aprobadaId: idAprobada, fuente })
      alCambiar(idAprobada)
    },
  })
  const aprobar = (fila: Aprobable) => {
    setEnCurso(fila.id)
    void aprobarLaCotizacion({
      ...pedidoDe(fila),
      alSerPrivada: () => {
        pregunta.abrir(fila.id)
      },
    }).finally(() => {
      setEnCurso(null)
    })
  }
  return { enCurso, aprobar, pedidoDe }
}
