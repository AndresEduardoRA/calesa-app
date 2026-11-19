import { Skeleton } from '@/shared/ui/skeleton'

// Mientras llegan las oportunidades del lead: la fila del título con «Nueva» y tres filas de una línea. Sin `h2`: el índice enfoca el del
// bloque.
export function EsqueletoDeOportunidades() {
  return (
    <div aria-busy="true" aria-label="Cargando las oportunidades" className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-11 w-20 md:h-8" />
      </div>
      <div className="grid gap-1">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-11 w-full md:h-9" />
        ))}
      </div>
    </div>
  )
}
