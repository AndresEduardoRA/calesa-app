import { ArrowLeftIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { CLAVE_DE_VUELTA, returnToSeguro, unParametro } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'

// «Volver» de la hoja de cotizar cuando se llegó de otra pantalla con `?returnTo=` (el «Cotizar lead» del «⋯» de un lead: la lista con sus
// filtros, el kanban o la ficha). Sólo una ruta interna (`returnToSeguro()`); sin `returnTo`, o con uno que no sirve, no se dibuja nada y
// la hoja queda como siempre. Guardar sigue llevando a la guardada.
type Parametros = PageProps<'/cotizaciones/nuevo'>['searchParams']

// La pantalla a la que vuelve la hoja (`?returnTo=`, sólo una ruta interna): «Volver» y las pestañas de origen, que la conservan.
export const volverDe = (url: Awaited<Parametros>) =>
  returnToSeguro(unParametro(url[CLAVE_DE_VUELTA]))

async function VolverDeLaHoja({ parametros }: { parametros: Parametros }) {
  const volverA = volverDe(await parametros)
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

// El título de la hoja, con «Volver» al lado cuando se llegó con `returnTo` (detrás de `<Suspense>`: lee la URL).
export function TituloDeLaHoja({ parametros }: { parametros: Parametros }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Cotizar</h1>
      <Suspense fallback={null}>
        <VolverDeLaHoja parametros={parametros} />
      </Suspense>
    </div>
  )
}
