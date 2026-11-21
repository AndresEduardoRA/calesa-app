import type { Route } from 'next'
import Link from 'next/link'
import { ChevronRightIcon } from 'lucide-react'

export type PasoDelCamino = {
  nombre: string
  ruta: Route
}

// El camino que lleva a la pieza (origen › fórmula ›), a la izquierda de su título: cada paso es un enlace y el título (el `h1` de la barra) es donde se está. Si un
// enlace sale con cambios sin guardar, pregunta (`useSalidaConCambios()` mira todo enlace de la pantalla).
export function CaminoDeLaEdicion({ pasos }: { pasos: readonly PasoDelCamino[] }) {
  return (
    <nav aria-label="Camino" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 text-(length:--text-sm) text-(--color-ink-soft)">
        {pasos.map((paso) => (
          <li key={paso.ruta} className="flex min-w-0 items-center gap-1">
            <Link href={paso.ruta} className="min-w-0 truncate underline-offset-4 hover:underline">
              {paso.nombre}
            </Link>
            <ChevronRightIcon aria-hidden className="size-3.5 shrink-0" />
          </li>
        ))}
      </ol>
    </nav>
  )
}
