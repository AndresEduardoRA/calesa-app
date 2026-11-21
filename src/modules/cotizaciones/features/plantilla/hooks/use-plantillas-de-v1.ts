'use client'

import { useEffect, useState } from 'react'
import { pedirPlantillasDeV1 } from '../../../areas/plantilla/composicion-plantillas-de-v1.client'
import type { DatosDePlantillasDeV1 } from '../../../entities/plantilla/datos-de-plantillas-de-v1'

export type LecturaDePlantillasDeV1 =
  | { estado: 'cargando' }
  | { estado: 'error'; mensaje: string }
  | { estado: 'lista'; datos: DatosDePlantillasDeV1; leidoEn: Date }

// Las cuatro plantillas de V1 con lo que tiene el origen, pedidas al montarse el modal (una vez por apertura, sin caché: llevan los borradores) y otra vez con
// «Reintentar» o «Recargar». Cerrar el modal corta el pedido en vuelo.
export function usePlantillasDeV1(origenId: string, formulaDelOrigenId: string) {
  const [vuelta, setVuelta] = useState(0)
  const [lectura, setLectura] = useState<LecturaDePlantillasDeV1>({ estado: 'cargando' })
  useEffect(() => {
    const control = new AbortController()
    void pedirPlantillasDeV1(origenId, formulaDelOrigenId, control.signal).then((r) => {
      if (control.signal.aborted) return
      setLectura(
        r.ok
          ? { estado: 'lista', datos: r.data, leidoEn: new Date() }
          : { estado: 'error', mensaje: r.error.mensaje },
      )
    })
    return () => control.abort()
  }, [origenId, formulaDelOrigenId, vuelta])
  return {
    lectura,
    recargar: () => {
      setLectura({ estado: 'cargando' })
      setVuelta((v) => v + 1)
    },
  }
}
