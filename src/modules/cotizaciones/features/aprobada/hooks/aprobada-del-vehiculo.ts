'use client'

import { useEffect, useEffectEvent } from 'react'

// Qué cotización es la aprobada de un vehículo, entre las islas de una misma pantalla: «Aprobar» de la cabecera de la guardada y el bloque «De este vehículo»
// aprueban por separado y ninguna refresca la página (remontaría lo tipeado en la hoja). Quien aprueba avisa; las demás islas del mismo vehículo se ponen al día.
// `fuente` es la isla que avisó: no se avisa a sí misma.
export type AvisoDeLaAprobada = { vehiculoId: string; aprobadaId: string; fuente: string }

const oyentes = new Set<(aviso: AvisoDeLaAprobada) => void>()

export function avisarAprobada(aviso: AvisoDeLaAprobada): void {
  for (const oyente of oyentes) {
    oyente(aviso)
  }
}

// Llama a `alCambiar(aprobadaId)` cuando otra isla aprueba una cotización de ese vehículo. Sin vehículo no escucha.
export function useAlCambiarLaAprobada(
  vehiculoId: string | null,
  fuente: string,
  alCambiar: (aprobadaId: string) => void,
): void {
  const alAvisar = useEffectEvent((aviso: AvisoDeLaAprobada) => {
    if (aviso.vehiculoId === vehiculoId && aviso.fuente !== fuente) {
      alCambiar(aviso.aprobadaId)
    }
  })
  useEffect(() => {
    if (vehiculoId === null) {
      return
    }
    const oyente = (aviso: AvisoDeLaAprobada) => {
      alAvisar(aviso)
    }
    oyentes.add(oyente)
    return () => {
      oyentes.delete(oyente)
    }
  }, [vehiculoId])
}
