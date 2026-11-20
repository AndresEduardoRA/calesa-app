import { CircleCheckIcon, CircleXIcon, TriangleAlertIcon } from 'lucide-react'
import type { EstadoDePaso } from '../../../entities/pasos'

// El ícono de un paso de «Para cotizar y mover» con su texto para lectores de pantalla: sólo «Listo» va en verde (✓); el aviso es ⚠ y lo
// que bloquea, ✗. Puro: lo usan la tira (servidor) y la tarjeta de la lista (navegador).
const DE_CADA_ESTADO = {
  listo: { Icono: CircleCheckIcon, color: 'text-(--color-positivo-ink)', texto: 'Listo' },
  aviso: { Icono: TriangleAlertIcon, color: 'text-(--color-aviso-ink)', texto: 'Aviso' },
  bloquea: { Icono: CircleXIcon, color: 'text-(--color-peligro-ink)', texto: 'Bloquea' },
} as const satisfies Record<EstadoDePaso, unknown>

export function IconoDelPaso({ estado }: { estado: EstadoDePaso }) {
  const { Icono, color, texto } = DE_CADA_ESTADO[estado]
  return (
    <>
      <Icono aria-hidden className={`mt-0.5 size-4 shrink-0 ${color}`} />
      <span className="sr-only">{`${texto}: `}</span>
    </>
  )
}
