'use client'

import { EsqueletoListado } from '@/shared/ui/esqueletos'
import { EstadoError } from '@/shared/ui/estados'
import type { LecturaDeLaDefinicion } from '../../hooks/use-lectura-de-la-definicion'

type Props = {
  estado: Exclude<LecturaDeLaDefinicion, { tipo: 'lista' }>
  nombreDelOrigen: string
  alReintentar: () => void
}

// Mientras la sesión lee la versión: el esqueleto, el error con «Reintentar» o que esa versión ya no se puede abrir (se descartó, o quien mira ya no configura el
// origen: la policy esconde las dos igual).
export function EstadoDeLaLectura({ estado, nombreDelOrigen, alReintentar }: Props) {
  if (estado.tipo === 'leyendo') return <EsqueletoListado filas={8} columnas={2} />
  if (estado.tipo === 'error') return <EstadoError alReintentar={alReintentar} />
  return (
    <p className="rounded-(--radius-md) bg-(--color-aviso-soft) p-2 text-(length:--text-sm) text-(--color-aviso-ink)">
      Esa versión de la fórmula ya no se puede abrir: se descartó o ya no configuras{' '}
      {nombreDelOrigen}.
    </p>
  )
}
