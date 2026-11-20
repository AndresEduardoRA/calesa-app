'use client'

import { useState, type ComponentProps, type ReactNode } from 'react'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useResumenDeCotizacion } from '../hooks/use-resumen-de-cotizacion'
import { ResumenDeCotizacionDiferido } from './diferidos'

type Props = Omit<
  ComponentProps<typeof ResumenDeCotizacionDiferido>,
  'filas' | 'dialogos' | 'alMontarse'
> & {
  // Los diálogos del «⋯» y de «Compartir» (`?panel=…&para=<id>`): van dentro del resumen mientras está abierto y montado, y aquí si no.
  dialogos: ReactNode
}

// El resumen de una cotización (`?cotizacion=`) en una pantalla que no es el listado (la ficha del lead y la del vehículo): trae sólo la cotización de la URL (`delServidor`, que
// leyó el servidor) y, como en el listado, llega recién al abrirse y queda montado para irse con su animación; los diálogos van dentro mientras está abierto. Cerrarlo borra su clave de la
// URL sin tocar lo de atrás (los filtros, la pestaña de la ficha).
export function ResumenFueraDelListado({ dialogos, ...props }: Props) {
  const resumen = useResumenDeCotizacion()
  const montado = useAbiertoAlgunaVez(resumen.texto !== null)
  const [listo, setListo] = useState(false)
  const dentro = resumen.texto !== null && listo
  return (
    <>
      {dentro ? null : dialogos}
      {montado ? (
        <ResumenDeCotizacionDiferido
          {...props}
          filas={[]}
          dialogos={dentro ? dialogos : null}
          alMontarse={setListo}
        />
      ) : null}
    </>
  )
}
