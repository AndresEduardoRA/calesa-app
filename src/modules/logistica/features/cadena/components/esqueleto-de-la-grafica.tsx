import { Skeleton } from '@/shared/ui/skeleton'

// Mientras llega el número de cada fase: la línea con seis puntos, cada uno con su nombre, su cifra y su barra. Fijo: no depende de lo que venga.
export function EsqueletoDeLaGrafica() {
  return (
    <div aria-busy="true" aria-label="Cargando la cadena" className="grid gap-3 pl-7">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="grid gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-7 w-12" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
      ))}
    </div>
  )
}
