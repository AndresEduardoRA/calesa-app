import { Skeleton } from '@/shared/ui/skeleton'

// Mientras llega «De este vehículo»: tres filas, con letrero para quien lee en voz alta. Lo usan la isla al acercarse y el `diferido()`.
export function EsqueletoDeEsteVehiculo() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando las cotizaciones de este vehículo"
      className="grid gap-2"
    >
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
    </div>
  )
}
