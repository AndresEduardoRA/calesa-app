import { Skeleton } from '@/shared/ui/skeleton'

// Sólo el esqueleto: el de la pieza, del ancho de la página.
export default function CargandoActividadReciente() {
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-2">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}
