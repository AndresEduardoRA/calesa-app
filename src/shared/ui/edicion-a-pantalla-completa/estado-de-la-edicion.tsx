import { cn } from 'cn'
import { textoDelEstado, tonoDelEstado, type EstadoDeLaEdicion } from '@/shared/lib/edicion'
import { Badge } from '../badge'

const TONOS = {
  aviso: 'bg-(--color-aviso-soft) text-(--color-aviso-ink)',
  neutro: 'bg-(--color-surface-3) text-(--color-ink-soft)',
  exito: 'bg-(--color-positivo-soft) text-(--color-positivo-ink)',
} as const

// El estado de la pieza, junto al título: «Cambios sin guardar», «Borrador» o «Publicada vN»; el detalle (quién y cuándo) en tinta suave desde `md`.
export function EstadoDeLaEdicionVisible({ estado }: { estado: EstadoDeLaEdicion }) {
  if (estado === null) {
    return null
  }
  const detalle = estado.tipo === 'cambios' ? undefined : estado.detalle
  return (
    <p role="status" className="flex min-w-0 items-center gap-2">
      <Badge className={cn('h-6 px-2.5 text-(length:--text-sm)', TONOS[tonoDelEstado(estado)])}>
        {textoDelEstado(estado)}
      </Badge>
      {detalle === undefined ? null : (
        <span className="hidden min-w-0 truncate text-(length:--text-sm) text-(--color-ink-soft) md:inline">
          {detalle}
        </span>
      )}
    </p>
  )
}
