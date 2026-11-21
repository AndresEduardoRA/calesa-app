import { Skeleton } from '@/shared/ui/skeleton'

// Mientras llegan las cotizaciones de una ficha (hasta acercarse, mientras llega su código y mientras lee): tres tarjetas, con letrero para quien lee en voz alta. Aparte de
// los componentes para que `diferidos.tsx` no los arrastre a la carga en frío.
export function EsqueletoDeLasTarjetas() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando las cotizaciones"
      className="flex gap-3 overflow-hidden"
    >
      <Skeleton className="h-96 w-68 shrink-0" />
      <Skeleton className="h-96 w-68 shrink-0" />
      <Skeleton className="h-96 w-68 shrink-0 max-md:hidden" />
    </div>
  )
}
