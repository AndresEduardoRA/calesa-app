import { Badge } from '@/shared/ui/badge'
import { textoDeSituacion } from '../../../entities/nucleo/situacion'
import type { VehiculoDeLaFase } from '../../../entities/cadena/leer'

type Props = {
  vehiculo: Pick<VehiculoDeLaFase, 'situacion' | 'demorada'>
  // «Desde hace 3 días en esta fase», ya armado contra el instante de la lectura.
  dias: string | null
}

// La celda de estado de un vehículo en la lista de su fase: los días en la fase, «En subasta» o «Sin resolver» si la subasta manda y «Demorado» si la base lo calculó.
// Siempre con texto, nunca sólo color. Sin nada que decir, no se dibuja.
export function EstadoEnLaFase({ vehiculo, dias }: Props) {
  const situacion = textoDeSituacion(vehiculo.situacion)
  if (!dias && !vehiculo.demorada && !situacion) {
    return null
  }
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-(length:--text-xs) text-(--color-ink-soft)">
      {dias ? <span>{dias}</span> : null}
      {situacion ? (
        <Badge variant="outline" data-situacion={vehiculo.situacion}>
          {situacion}
        </Badge>
      ) : null}
      {vehiculo.demorada ? <Badge variant="destructive">Demorado</Badge> : null}
    </p>
  )
}
