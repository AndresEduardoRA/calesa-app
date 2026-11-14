import { Skeleton } from '@/shared/ui/skeleton'

// Mientras llega la bandeja del día: el título y tres grupos con sus filas. Fijo: no depende de lo que venga.
export function EsqueletoDeLaBandeja() {
  return (
    <div aria-busy="true" aria-label="Cargando la bandeja del día" className="grid gap-3">
      <Skeleton className="h-6 w-40" />
      {Array.from({ length: 3 }, (_, grupo) => (
        <div
          key={grupo}
          className="grid gap-2 rounded-(--radius-card) border border-(--color-line) p-3"
        >
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  )
}
