import { Skeleton } from '@/shared/ui/skeleton'

// Lo que se ve mientras llega el encabezado de un origen: la vuelta, el nombre (con un `h1` para el lector), los cinco pasos y las pestañas.
export function EsqueletoDelMarco() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando el origen"
      className="grid min-w-0 gap-4"
    >
      <h1 className="sr-only">Origen</h1>
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-7 w-56 max-w-full" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-14 rounded-(--radius-md)" />
        ))}
      </div>
      <Skeleton className="h-9 w-full" />
    </div>
  )
}
