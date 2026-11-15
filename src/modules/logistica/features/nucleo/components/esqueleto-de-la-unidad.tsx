import { Skeleton } from '@/shared/ui/skeleton'

// El lugar de la unidad mientras llega (`loading.tsx` y el `Suspense` de la página): la forma de las zonas sólo con CSS, sin saber el ancho: dos columnas desde 56 rem del contenedor, una por debajo.
// Compatible con servidor.
export function EsqueletoDeLaUnidad() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando la unidad"
      className="@container/unidad grid min-w-0 gap-3 @min-[56rem]/unidad:h-(--alto-del-detalle) @min-[56rem]/unidad:grid-rows-[auto_minmax(0,1fr)]"
    >
      <Skeleton className="h-24 rounded-(--radius-card)" />
      <div className="grid min-h-0 gap-3 @min-[56rem]/unidad:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <div className="grid min-h-0 gap-3 @min-[56rem]/unidad:grid-rows-[minmax(0,5fr)_minmax(0,4fr)]">
          <Skeleton className="h-40 rounded-(--radius-card) @min-[56rem]/unidad:h-full" />
          <Skeleton className="h-40 rounded-(--radius-card) @min-[56rem]/unidad:h-full" />
        </div>
        <Skeleton className="h-40 rounded-(--radius-card) @min-[56rem]/unidad:h-full" />
      </div>
    </div>
  )
}

// La portada de la cabecera mientras llega: del mismo tamaño (4:3, 7 rem de ancho), para que la cabecera no salte.
export function EsqueletoDeLaFoto() {
  return <Skeleton className="aspect-4/3 w-28 shrink-0 rounded-(--radius-sm)" />
}
