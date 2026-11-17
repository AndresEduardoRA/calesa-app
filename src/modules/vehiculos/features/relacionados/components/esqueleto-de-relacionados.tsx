import { Skeleton } from '@/shared/ui/skeleton'
import type { PresentacionDeRelacionados } from '../../../entities/relacionados'

// El lugar de «Relacionados» mientras llega, del alto de lo que viene para que la pantalla no salte: compacta, el título y tres celdas de la grilla; en una línea, tres chips del alto de uno.
export function EsqueletoDeRelacionados({
  presentacion,
}: {
  presentacion: PresentacionDeRelacionados
}) {
  if (presentacion === 'compacta') {
    return (
      <section
        aria-busy="true"
        aria-label="Cargando los relacionados"
        className="grid min-w-0 gap-2"
      >
        <div className="flex min-h-11 items-center md:min-h-8">
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] gap-x-4 gap-y-3">
          {[0, 1, 2].map((n) => (
            <Skeleton key={n} className="h-20 w-full rounded-(--radius-md)" />
          ))}
        </div>
      </section>
    )
  }
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
