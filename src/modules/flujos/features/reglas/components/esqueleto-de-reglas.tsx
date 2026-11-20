import { Skeleton } from '@/shared/ui/skeleton'

// La forma de la sección «Reglas» del panel: unas filas de reglas.
export function EsqueletoDeReglas() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Cargando las reglas">
      <Skeleton className="h-6 w-40" />
      <ul className="grid gap-2">
        {Array.from({ length: 5 }, (_, n) => (
          <li key={n}>
            <Skeleton className="h-20 w-full" />
          </li>
        ))}
      </ul>
    </div>
  )
}
