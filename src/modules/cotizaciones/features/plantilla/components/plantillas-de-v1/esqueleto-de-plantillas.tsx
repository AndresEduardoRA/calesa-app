import { Skeleton } from '@/shared/ui/skeleton'
import { CLAVES_DE_PLANTILLA_DE_V1 } from '../../../../entities/plantillas-de-v1/claves'

// Mientras llegan las plantillas: una tarjeta por cada una, con el lugar de su nombre, su frase y su tarjeta.
export function EsqueletoDePlantillas() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando las plantillas"
      className="grid grid-cols-1 gap-3 md:grid-cols-2"
    >
      {CLAVES_DE_PLANTILLA_DE_V1.map((clave) => (
        <div
          key={clave}
          className="grid min-w-0 gap-2 rounded-(--radius-lg) border border-(--color-line) p-3"
        >
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="aspect-[3/2] w-full" />
        </div>
      ))}
    </div>
  )
}
