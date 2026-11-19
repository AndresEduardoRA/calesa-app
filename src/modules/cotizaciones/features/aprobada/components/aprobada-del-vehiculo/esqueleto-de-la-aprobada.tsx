import { Skeleton } from '@/shared/ui/skeleton'

// Mientras se lee «Cotización aprobada»: el marco de la portada (15:8) y dos líneas.
export function EsqueletoDeLaAprobada() {
  return (
    <div aria-hidden className="grid min-w-0 gap-3">
      <Skeleton className="aspect-15/8 w-full rounded-(--radius-card)" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}
