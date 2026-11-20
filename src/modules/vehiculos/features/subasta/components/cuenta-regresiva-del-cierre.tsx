'use client'

import { cn } from 'cn'
import type { TonoDeLaCuenta } from '../../../entities/cuenta-regresiva-del-cierre'
import { useCuentaDelCierre } from '../hooks/use-cuenta-del-cierre'

type Props = {
  // El cierre de la subasta (`cierre_subasta_en`, ISO); null = sin fecha.
  cierre: string | null
  // El instante (ISO) con el que el servidor dibujó la pantalla: el primer texto, el mismo al hidratar.
  ahora: string
  className?: string
}

const COLOR: Record<TonoDeLaCuenta, string> = {
  normal: 'text-(--color-ink-soft)',
  aviso: 'text-(--color-aviso-ink) font-medium',
  urgente: 'text-(--color-peligro-ink) font-medium',
  cerrando: 'text-(--color-ink-soft)',
  cerro: 'text-(--color-ink-soft)',
  sin_fecha: 'text-(--color-ink-faint)',
}

// La cuenta regresiva del cierre de una subasta, viva («Cierra en 2 d 04:12:33»): ámbar con menos de 24 h y roja con menos de 1 h; el texto siempre dice lo mismo que el color. La
// lista de vehículos (una por tarjeta o fila en subasta) y la ficha la comparten, y todas se cuentan con un solo temporizador por página. Sin `aria-live`: un lector de pantalla
// no anuncia cada segundo.
export function CuentaRegresivaDelCierre({ cierre, ahora, className }: Props) {
  const cuenta = useCuentaDelCierre(cierre, ahora)
  return (
    <span
      data-cuenta-regresiva={cuenta.tono}
      className={cn(
        'block truncate text-(length:--text-xs) tabular-nums',
        COLOR[cuenta.tono],
        className,
      )}
    >
      {cuenta.texto}
    </span>
  )
}
