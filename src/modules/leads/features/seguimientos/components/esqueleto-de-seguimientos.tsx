import { Skeleton } from '@/shared/ui/skeleton'

function Filas({ cuantas }: { cuantas: number }) {
  return (
    <>
      {Array.from({ length: cuantas }, (_, n) => (
        <div key={n} className="grid gap-2 rounded-(--radius-lg) border border-(--color-line) p-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-40" />
        </div>
      ))}
    </>
  )
}

// Mientras llega lo de seguimientos, con la forma real: en el bloque de la ficha (`resumen`), el título y dos columnas de tres; en «Ver
// todos» (`linea`), el botón y tres seguimientos. Del alto aproximado de lo que viene: un salto al bloque de abajo no se mueve.
export function EsqueletoDeSeguimientos({ forma = 'resumen' }: { forma?: 'resumen' | 'linea' }) {
  if (forma === 'linea') {
    return (
      <div aria-hidden className="grid gap-3">
        <Skeleton className="h-11 w-44 md:h-9" />
        <Filas cuantas={3} />
      </div>
    )
  }
  return (
    <div aria-hidden className="@container/resumen grid gap-4">
      <Skeleton className="h-5 w-56" />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 @[36rem]/resumen:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {[0, 1].map((columna) => (
          <div key={columna} className="grid content-start gap-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-11 w-44 md:h-9" />
            <Filas cuantas={3} />
          </div>
        ))}
      </div>
    </div>
  )
}
