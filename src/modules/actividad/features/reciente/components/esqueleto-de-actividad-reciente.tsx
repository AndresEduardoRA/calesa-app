import { Skeleton } from '@/shared/ui/skeleton'

// Mientras se leen los cambios: tres filas del alto de una frase. Las usan el `<Suspense>` de la pieza y, con el título, el de la ficha que
// la monta (el mismo alto: nada salta al llegar).
export function FilasDelEsqueleto() {
  return (
    <div aria-busy="true" aria-label="Cargando la actividad" className="grid gap-2">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

// «Actividad reciente» entera mientras llega, con el lugar de su título (la ficha que la monta lee antes los ajustes de la empresa).
export function EsqueletoDeActividadReciente() {
  return (
    <div className="grid min-w-0 gap-2">
      <Skeleton className="h-6 w-40" />
      <FilasDelEsqueleto />
    </div>
  )
}
