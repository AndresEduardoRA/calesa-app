'use client'

import { fechaRelativa, formatearFechaHora } from '@/shared/lib/fechas'
import { useRegional } from '@/shared/ui/regional'
import type { UltimoCambio as Cambio } from '../../../../entities/tipos-cambio-vigentes'

// «Gina Barra · hace 5 minutos»: quién y cuándo cambió el valor por última vez (sin nombre, sólo cuándo; nunca el correo). La hora
// exacta, en la zona de la empresa, al pasar el puntero.
export function UltimoCambio({ cambio }: { cambio: Cambio | null }) {
  const { zonaHoraria } = useRegional()
  if (!cambio) {
    return null
  }
  const cuando = fechaRelativa(cambio.en, { zona: zonaHoraria, numerico: true })
  return (
    <p className="text-(length:--text-xs) break-words text-(--color-ink-faint)">
      <span className="sr-only">Último cambio: </span>
      <time dateTime={cambio.en} title={formatearFechaHora(cambio.en, { zona: zonaHoraria })}>
        {cambio.por ? `${cambio.por} · ${cuando}` : cuando}
      </time>
    </p>
  )
}
