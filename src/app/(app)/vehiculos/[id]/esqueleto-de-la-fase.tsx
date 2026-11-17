import { Skeleton } from '@/shared/ui/skeleton'

// La forma de «Qué falta» mientras llega la unidad: una línea y dos destinos.
export function EsqueletoDelHuecoDeLaFase() {
  return (
    <div aria-busy="true" aria-label="Cargando lo que falta" className="grid gap-2">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
    </div>
  )
}
