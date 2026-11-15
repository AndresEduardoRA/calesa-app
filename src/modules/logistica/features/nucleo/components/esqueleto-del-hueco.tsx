import { Skeleton } from '@/shared/ui/skeleton'

// Lo que se ve de un hueco mientras llega su código: unas líneas en su lugar, en vez de un hueco en blanco. Compatible con servidor.
export function EsqueletoDelHueco() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando la sección" className="grid gap-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-2/3" />
    </div>
  )
}
