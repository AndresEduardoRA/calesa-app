import { ArrowLeftIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { CLAVE_DE_VUELTA, returnToSeguro, unParametro } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'

// «Volver» de una cotización guardada cuando se llegó de otra pantalla con `?returnTo=` (el «Abrir cotización» del resumen sobre la ficha de un lead o de un vehículo). Sólo una ruta interna
// (`returnToSeguro()`); sin `returnTo`, o con uno que no sirve, no se dibuja nada y la página queda como siempre.
export function VolverALaFicha({
  parametros,
}: {
  parametros: Awaited<PageProps<'/cotizaciones/[id]'>['searchParams']>
}) {
  const volverA = returnToSeguro(unParametro(parametros[CLAVE_DE_VUELTA]))
  if (volverA === null) {
    return null
  }
  return (
    <Link
      href={volverA as Route}
      className={buttonVariants({ variant: 'ghost', className: 'min-h-11 w-fit md:min-h-9' })}
    >
      <ArrowLeftIcon aria-hidden />
      Volver
    </Link>
  )
}
