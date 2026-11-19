import type { Route } from 'next'
import Link from 'next/link'
import { CotizacionesDelLead } from '@/modules/cotizaciones/pantallas/lead'
import { buttonVariants } from '@/shared/ui/button'
import { TituloDeBloqueConAccion } from '@/shared/ui/ficha-en-bloques'

type Props = {
  leadId: string
  // La hoja de cotizar con este lead en el primer origen donde quien mira cotiza (la misma de «Cotizar lead» del «⋯» de la cabecera), o null
  // sin `cotizaciones.crear`: el título va sin «Cotizar».
  cotizar: string | null
}

const ID_DEL_TITULO = 'cotizaciones-titulo'

// «Cotizaciones» de la ficha del lead: el título lo dibuja el servidor con su única acción, «Cotizar» (el primer `h2` del bloque, el que
// enfoca el índice; se ve antes de leer), y debajo la isla que lee las 3 más recientes al acercarse. `leads` no conoce `cotizaciones`: lo
// compone esta ruta, como la ficha del vehículo. La `key` empieza de cero con otro lead.
export function BloqueCotizacionesDelLead({ leadId, cotizar }: Props) {
  return (
    <section aria-labelledby={ID_DEL_TITULO} className="grid min-w-0 gap-2">
      <TituloDeBloqueConAccion
        id={ID_DEL_TITULO}
        titulo="Cotizaciones"
        accion={
          cotizar === null ? null : (
            <Link
              href={cotizar as Route}
              className={buttonVariants({
                variant: 'outline',
                size: 'sm',
                className: 'min-h-11 md:min-h-8',
              })}
            >
              Cotizar
            </Link>
          )
        }
      />
      <CotizacionesDelLead key={leadId} leadId={leadId} />
    </section>
  )
}
