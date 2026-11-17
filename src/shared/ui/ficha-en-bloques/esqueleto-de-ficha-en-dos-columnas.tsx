import { Skeleton } from '../skeleton'
import { ALTO_DEL_INDICE } from './estilos'

// Mientras llega una ficha en bloques: la misma forma (dos columnas desde 56 rem de contenedor, una por debajo), la tarjeta de la
// izquierda, el índice y dos bloques.
export function EsqueletoDeFichaEnDosColumnas() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando la ficha"
      className={`@container/ficha grid gap-4 ${ALTO_DEL_INDICE}`}
    >
      <Skeleton className="h-5 w-16" />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 @[56rem]/ficha:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] @[56rem]/ficha:gap-6">
        <div className="grid content-start gap-4 rounded-(--radius-card) border border-(--color-line) p-4">
          <Skeleton className="h-7 w-56 max-w-full" />
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }, (_, n) => (
              <Skeleton key={n} className="h-9" />
            ))}
          </div>
          <Skeleton className="h-16" />
        </div>
        <div className="grid min-w-0 content-start gap-8">
          <div className="flex h-(--alto-del-indice) items-center gap-2 border-b border-(--color-line)">
            {Array.from({ length: 4 }, (_, n) => (
              <Skeleton key={n} className="h-5 w-24" />
            ))}
          </div>
          {Array.from({ length: 2 }, (_, n) => (
            <div key={n} className="grid gap-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-40 rounded-(--radius-card)" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
