import { Skeleton } from '@/shared/ui/skeleton'

// Las columnas del embudo del lead mientras llega el código del arrastre: tres etapas con una tarjeta (una sola bajo el otro en el celular).
// Del alto de lo que viene: no mueve lo de abajo.
export function EsqueletoDelTablero() {
  return (
    <div aria-hidden className="grid gap-2 @xl/oportunidades:flex">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton
          key={i}
          className="h-24 w-full @xl/oportunidades:w-44 @xl/oportunidades:shrink-0"
        />
      ))}
    </div>
  )
}

// Mientras llegan las oportunidades del lead: la fila del título con «Nueva» y el tablero. Sin `h2`: el índice enfoca el del bloque.
export function EsqueletoDeOportunidades() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando las oportunidades"
      className="@container/oportunidades grid gap-3"
    >
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-11 w-20 md:h-8" />
      </div>
      <EsqueletoDelTablero />
    </div>
  )
}
