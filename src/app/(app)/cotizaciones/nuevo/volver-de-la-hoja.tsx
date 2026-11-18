import { ArrowLeftIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { CLAVE_DE_VUELTA, returnToSeguro, unParametro } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'

// «Volver» de la hoja de cotizar cuando se llegó de otra pantalla con `?returnTo=` (el «Cotizar lead» del «⋯» de un lead: la lista con sus
// filtros, el kanban o la ficha). Sólo una ruta interna (`returnToSeguro()`); sin `returnTo`, o con uno que no sirve, no se dibuja nada y
// la hoja queda como siempre. Guardar sigue llevando a la guardada.
export async function VolverDeLaHoja({
  parametros,
}: {
  parametros: PageProps<'/cotizaciones/nuevo'>['searchParams']
}) {
  const volverA = returnToSeguro(unParametro((await parametros)[CLAVE_DE_VUELTA]))
  if (volverA === null) {
    return null
  }
  return (
    <Link
      href={volverA as Route}
      className={buttonVariants({ variant: 'ghost', className: 'ms-auto min-h-11 md:min-h-9' })}
    >
      <ArrowLeftIcon aria-hidden />
      Volver
    </Link>
  )
}
