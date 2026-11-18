'use client'

import { useMemo, type ComponentProps } from 'react'
import { useLectorDeOpciones, useTituloDeLaCotizacion } from '@/modules/cotizaciones/client'
import { CampoDelTituloDiferido } from '@/modules/cotizaciones/pantallas/cotizar'
import { BarraDelVehiculo, type ParaElegir } from '@/modules/vehiculos/pantallas/cotizar'

type Props = Omit<
  ComponentProps<typeof BarraDelVehiculo>,
  'paraElegir' | 'titulo' | 'arribaDelPanel'
> & {
  // El dato del elegido que se elige entre las filas de una tabla de la hoja (4.14-2c3), sin el lector; null = ninguno.
  paraElegir: ParaElegir | null
  // La hoja abierta: las opciones se leen con ella (`cotizacion_tabla`), de la versión que se dibuja.
  abierta: string
}

// La barra del vehículo de la hoja con el lector de las opciones del dato del vehículo y el título de la cotización: `vehiculos` no conoce `cotizaciones` y una función no
// viaja del servidor al navegador, así que este componente de la página arma con los hooks de `cotizaciones/client` el lector, el título que se ve (grande, con el vehículo
// debajo) y el campo del título arriba del panel (T307).
export function BarraDeLaHoja({ paraElegir, abierta, ...props }: Props) {
  const leerOpciones = useLectorDeOpciones({ origenId: props.origenId, abierta })
  const titulo = useTituloDeLaCotizacion()
  const conLector = useMemo(
    () => (paraElegir === null ? null : { ...paraElegir, leerOpciones }),
    [paraElegir, leerOpciones],
  )
  return (
    <BarraDelVehiculo
      {...props}
      paraElegir={conLector}
      titulo={titulo?.mostrado ?? null}
      arribaDelPanel={<CampoDelTituloDiferido />}
    />
  )
}
