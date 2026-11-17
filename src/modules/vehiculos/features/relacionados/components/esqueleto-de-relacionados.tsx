import { Skeleton } from '@/shared/ui/skeleton'
import type { PresentacionDeRelacionados } from '../../../entities/relacionados'

// El lugar del bloque «Relacionados» mientras llega: del alto de uno con sus tres grupos, para que la ficha no salte al aparecer. En una línea (la unidad de logística), tres chips del alto de uno.
export function EsqueletoDeRelacionados({
  presentacion = 'bloque',
}: {
  presentacion?: 'bloque' | PresentacionDeRelacionados
}) {
  if (presentacion === 'compacta') {
    return (
      <section
        aria-busy="true"
        aria-label="Cargando los relacionados"
        className="grid min-w-0 gap-2"
      >
        <Skeleton className="h-5 w-28" />
        <div className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] gap-x-4 gap-y-3">
          {[0, 1, 2].map((n) => (
            <Skeleton key={n} className="h-20 w-full rounded-(--radius-md)" />
          ))}
        </div>
      </section>
    )
  }
  if (presentacion === 'linea') {
    return (
      <section
        aria-busy="true"
        aria-label="Cargando los relacionados"
        className="flex min-w-0 flex-wrap items-center gap-2"
      >
        {[0, 1, 2].map((n) => (
          <Skeleton key={n} className="h-11 w-28 rounded-(--radius-md) md:h-8" />
        ))}
      </section>
    )
  }
  return (
    <section
      aria-busy="true"
      aria-label="Cargando los relacionados"
      className="@container grid min-w-0 gap-2"
    >
      <Skeleton className="h-5 w-28" />
      <div className="grid gap-3 @3xl:grid-cols-3">
        {[0, 1, 2].map((n) => (
          <Skeleton key={n} className="h-28 w-full rounded-(--radius-card)" />
        ))}
      </div>
    </section>
  )
}
