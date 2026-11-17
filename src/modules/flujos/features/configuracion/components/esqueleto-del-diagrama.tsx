import { Skeleton } from '@/shared/ui/skeleton'

// El alto del lienzo del diagrama: el mismo para el esqueleto y el diagrama, así nada salta al llegar el código.
export const ALTO_DEL_LIENZO = 'h-[min(32rem,70dvh)]'

// Lo que se ve mientras llega el código del diagrama (`diferido()`). Fuera de `diagrama/`: no importa `@xyflow/react`.
export function EsqueletoDelDiagrama() {
  return (
    <div role="status" aria-label="Cargando el diagrama del flujo" className={ALTO_DEL_LIENZO}>
      <Skeleton className="size-full rounded-(--radius-card)" />
    </div>
  )
}
