import type { Route } from 'next'
import Link from 'next/link'
import { ID_DE_LA_RANURA_DE_COMPARAR } from '@/modules/cotizaciones/pantallas/aprobada-fichas'
import { buttonVariants } from '@/shared/ui/button'
import { TituloDeBloqueConAccion } from '@/shared/ui/ficha-en-bloques'
import { CotizacionesDeEsteVehiculo } from './cotizaciones-de-este-vehiculo'

type Props = {
  vehiculo: { id: string; titulo: string }
  // La hoja de cotizar con este vehículo y la vuelta a la ficha, o null sin `cotizaciones.crear` en su origen: el título va sin «Cotizar».
  cotizar: string | null
  aprobarEn: 'todos' | readonly string[]
}

const ID_DEL_TITULO = 'cotizaciones-titulo'

// «Cotizaciones de este vehículo»: el título lo dibuja el servidor con su única acción, «Cotizar» (el primer `h2` del bloque, el que enfoca el
// índice), y debajo la fila de tarjetas que lee al acercarse; junto a «Cotizar», la ranura donde la isla pone «Comparar».
export function BloqueCotizaciones({ vehiculo, cotizar, aprobarEn }: Props) {
  return (
    <section aria-labelledby={ID_DEL_TITULO} className="grid min-w-0 gap-3">
      <TituloDeBloqueConAccion
        id={ID_DEL_TITULO}
        titulo="Cotizaciones de este vehículo"
        accion={
          <div className="flex flex-wrap items-center gap-2">
            {/* La isla pone aquí «Comparar» (un portal): el título no se vuelve a montar. */}
            <div id={ID_DE_LA_RANURA_DE_COMPARAR} className="contents" />
            {cotizar === null ? null : (
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
            )}
          </div>
        }
      />
      <CotizacionesDeEsteVehiculo
        vehiculo={vehiculo}
        aprobarEn={aprobarEn}
        volverA={`/vehiculos/${vehiculo.id}`}
      />
    </section>
  )
}
