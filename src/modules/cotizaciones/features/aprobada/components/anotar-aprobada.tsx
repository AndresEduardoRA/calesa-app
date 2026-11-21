'use client'

import { useEffect, useId } from 'react'
import { anotarAprobada, olvidarAprobada } from '../../privada/hooks/aprobada-anotada'
import { useAlCambiarLaAprobada } from '../hooks/aprobada-del-vehiculo'

type Props = {
  id: string
  aprobada: boolean
  vehiculoId: string | null
}

// Le dice al núcleo si la guardada es la aprobada de su vehículo (`aprobada-anotada.ts`), para que «Hacer privada» aparezca apagada con su motivo: lo leído en el
// servidor al montarse y, después, lo que aprueben «Aprobar» o «De este vehículo» (sus avisos entre islas). No dibuja nada.
export function AnotarAprobada({ id, aprobada, vehiculoId }: Props) {
  const fuente = useId()
  useEffect(() => {
    anotarAprobada(id, aprobada)
    return () => {
      olvidarAprobada(id)
    }
  }, [id, aprobada])
  useAlCambiarLaAprobada(vehiculoId, fuente, (aprobadaId) => {
    anotarAprobada(id, aprobadaId === id)
  })
  return null
}
