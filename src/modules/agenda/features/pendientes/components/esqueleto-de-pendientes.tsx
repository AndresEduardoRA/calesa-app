import { Skeleton } from '@/shared/ui/skeleton'

const FILAS = [0, 1, 2, 3]

// Mientras llegan los pendientes (su propio `<Suspense>`: la hoja del día no los espera). Un Server Component sin chunks de cliente.
export function EsqueletoDePendientes() {
  return (
    <div aria-busy="true" aria-label="Cargando tus pendientes" className="grid content-start gap-2">
      <Skeleton className="h-6 w-32" />
      {FILAS.map((n) => (
        <Skeleton key={n} className="h-11 rounded-md" />
      ))}
    </div>
  )
}
