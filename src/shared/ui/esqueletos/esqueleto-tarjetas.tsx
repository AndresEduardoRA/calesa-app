import { Skeleton } from '../skeleton'

type Props = { tarjetas?: number; etiqueta?: string }

// Patrón «tarjetas de ajustes»: el título de la página y las tarjetas en la misma grilla de columnas que las de verdad.
export function EsqueletoTarjetas({ tarjetas = 4, etiqueta = 'Cargando los ajustes' }: Props) {
  return (
    <div role="status" aria-busy="true" aria-label={etiqueta} className="grid max-w-6xl gap-4">
      <Skeleton className="h-7 w-48" />
      <div className="@container/ajustes min-w-0">
        <div className="columns-1 gap-4 @2xl/ajustes:columns-2 @5xl/ajustes:columns-3">
          {Array.from({ length: tarjetas }, (_, tarjeta) => (
            <div
              key={tarjeta}
              className="mb-4 grid break-inside-avoid gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4"
            >
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
              <Skeleton className="h-3.5 w-3/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
