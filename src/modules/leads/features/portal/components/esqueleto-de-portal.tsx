import { Skeleton } from '@/shared/ui/skeleton'

// Mientras llega el acceso del cliente: el título, la línea del estado y el botón a todo el ancho.
export function EsqueletoDePortal() {
  return (
    <div aria-busy="true" aria-label="Cargando el acceso al portal" className="grid gap-3">
      <Skeleton className="h-5 w-36" />
      <div className="grid gap-1.5">
        <Skeleton className="h-4 w-48 max-w-full" />
        <Skeleton className="h-3 w-64 max-w-full" />
      </div>
      <Skeleton className="h-11 w-full md:h-9" />
    </div>
  )
}
