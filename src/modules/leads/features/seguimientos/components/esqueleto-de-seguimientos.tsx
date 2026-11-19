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

// Una fila de la línea de tiempo: el círculo del tipo y dos líneas.
function FilaDeLaLinea() {
  return (
    <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3">
      <Skeleton className="size-8 rounded-full" />
      <div className="grid gap-1.5 pt-1.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  )
}

// Mientras llega lo de seguimientos, con la forma real: en el bloque «Seguimiento» de la ficha (`resumen`), la fila del título (el texto y
// los cuadrados del «+» y el «⋯»), la fila del recordatorio y tres de la línea de tiempo; en «Ver todos» (`linea`), el botón y tres
// seguimientos. Del alto aproximado de lo que viene: un salto al bloque de abajo no se mueve. Sin `h2`: el índice enfoca el del bloque.
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
    <div aria-hidden className="grid gap-3">
      <div className="flex items-center gap-1">
        <Skeleton className="h-5 w-28 grow-0" />
        <span className="grow" />
        <Skeleton className="size-[44px] md:size-8" />
        <Skeleton className="size-[44px] md:size-8" />
      </div>
      <Skeleton className="h-14 rounded-(--radius-md)" />
      <div className="grid gap-3">
        <FilaDeLaLinea />
        <FilaDeLaLinea />
        <FilaDeLaLinea />
      </div>
    </div>
  )
}
