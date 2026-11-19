import { Skeleton } from '@/shared/ui/skeleton'

// Lo que se ve en el bloque «Cotizaciones» de la ficha del lead hasta acercarse, mientras llega su código y mientras lee: las tres filas. Aparte del componente para que `diferidos.tsx` no lo arrastre a la carga en frío.
export function EsqueletoDeLasCotizaciones() {
  return (
    <div aria-busy="true" aria-label="Cargando las cotizaciones" className="grid gap-2">
      <Skeleton className="h-9" />
      <Skeleton className="h-9" />
      <Skeleton className="h-9" />
    </div>
  )
}
