import { Skeleton } from '@/shared/ui/skeleton'

const COLUMNAS = 3
const FILAS = 6

// Mientras llega «Comparar cotizaciones»: la columna de etiquetas y tres columnas de seis filas, con letrero para quien lee en voz alta. Lo usan el `<Suspense>` de la
// página y su `loading.tsx`.
export function EsqueletoDeComparar() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando la comparación"
      className="grid min-w-0 grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,2fr))] gap-3"
    >
      {Array.from({ length: FILAS + 1 }, (_, fila) => (
        <div key={fila} className="contents">
          <Skeleton className={fila === 0 ? 'h-24' : 'h-6'} />
          {Array.from({ length: COLUMNAS }, (_, columna) => (
            <Skeleton key={columna} className={fila === 0 ? 'h-24' : 'h-6'} />
          ))}
        </div>
      ))}
    </div>
  )
}
