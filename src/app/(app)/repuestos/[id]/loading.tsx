import { EsqueletoListado } from '@/shared/ui/esqueletos'
import { Skeleton } from '@/shared/ui/skeleton'

// Lo que se ve mientras llega el proyecto: la cabecera, la fila de pasos y la hoja.
export function CargandoUnProyectoCuerpo() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-16 w-full max-w-xl" />
      <Skeleton className="h-16 w-full" />
      <EsqueletoListado filas={6} columnas={6} />
    </div>
  )
}

export default function CargandoUnProyecto() {
  return <CargandoUnProyectoCuerpo />
}
