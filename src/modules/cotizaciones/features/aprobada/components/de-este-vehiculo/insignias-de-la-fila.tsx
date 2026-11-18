import { badgeVariants } from '@/shared/ui/badge'
import {
  ETIQUETA_DE_ESTA,
  ETIQUETA_DE_VENCIDA,
  type FilaDeEsteVehiculo,
} from '../../../../entities/aprobada/de-este-vehiculo'
import {
  ETIQUETA_DE_APROBADA,
  ETIQUETA_DE_CLASE,
} from '../../../../entities/historial-del-vehiculo'

// Las insignias de una fila de «De este vehículo»: «Aprobada», «Final», «Vencida» y «Esta». Un `<span>` con las clases de `<Badge>` (sin el primitivo de Base UI).
export function InsigniasDeLaFila({
  fila,
  esta,
}: {
  fila: Pick<FilaDeEsteVehiculo, 'aprobada' | 'clase' | 'vencida'>
  esta: boolean
}) {
  const insignias = [
    fila.aprobada && {
      clave: 'aprobada',
      texto: ETIQUETA_DE_APROBADA,
      variant: 'secondary' as const,
    },
    fila.clase === 'final' && {
      clave: 'final',
      texto: ETIQUETA_DE_CLASE.final,
      variant: 'default' as const,
    },
    fila.vencida && {
      clave: 'vencida',
      texto: ETIQUETA_DE_VENCIDA,
      variant: 'destructive' as const,
    },
    esta && { clave: 'esta', texto: ETIQUETA_DE_ESTA, variant: 'outline' as const },
  ].filter((insignia) => insignia !== false)
  if (insignias.length === 0) {
    return null
  }
  return (
    <p className="flex flex-wrap gap-1">
      {insignias.map((insignia) => (
        <span
          key={insignia.clave}
          className={badgeVariants({ variant: insignia.variant, className: 'shrink-0' })}
        >
          {insignia.texto}
        </span>
      ))}
    </p>
  )
}
