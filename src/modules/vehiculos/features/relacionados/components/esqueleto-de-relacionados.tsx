import { Skeleton } from '@/shared/ui/skeleton'

// El lugar del bloque «Relacionados» mientras llega: del alto de uno con sus tres grupos, para que la ficha no salte al aparecer.
export function EsqueletoDeRelacionados() {
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
