import { Badge } from '@/shared/ui/badge'
import { ETIQUETA_DEL_ESTADO, type EstadoDeIntegracion } from '../../../entities/integraciones'

// El estado junto al título de la tarjeta: texto y color, nunca sólo color.
const VARIANTE = {
  activa: 'default',
  apagada: 'outline',
  falta_la_clave: 'destructive',
} as const satisfies Record<EstadoDeIntegracion, 'default' | 'outline' | 'destructive'>

export function EstadoDeLaIntegracion({ estado }: { estado: EstadoDeIntegracion }) {
  return <Badge variant={VARIANTE[estado]}>{ETIQUETA_DEL_ESTADO[estado]}</Badge>
}
