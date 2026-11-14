import { EsqueletoTabla } from '@/shared/ui/esqueletos'
import { Skeleton } from '@/shared/ui/skeleton'

// Mientras llega la lista de una fase: el encabezado y la tabla con su barra de filtros. Fijo: no depende de lo que venga.
export function EsqueletoDeLaFase() {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-48" />
      </div>
      <EsqueletoTabla />
    </div>
  )
}
