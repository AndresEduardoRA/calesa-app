'use client'

import Image from 'next/image'
import type { ParteDeCompartir } from '../../hooks/use-parte-de-compartir'
import type { PortadaParaCompartir as Portada } from '../../hooks/use-para-compartir-la-cotizacion'
import { PROPORCION_DE_LA_PORTADA } from '../portada/portada-de-la-cotizacion'
import { RecuadroDeLaPortada } from '../portada/recuadro-de-la-portada'

type Props = {
  portada: ParteDeCompartir<Portada>
  numero: number
  alReintentar: () => void
}

// «Imagen › Cotización»: la portada tal como sale (la que se copia, descarga o comparte), en el marco de su proporción. Mientras se arma, el recuadro de la portada con
// «Preparando la vista previa…»; si falla, «No se pudo armar la imagen.» con «Reintentar» (el texto y el PDF siguen). Con el Modo Live el panel no muestra nada.
export function PortadaParaCompartir({ portada, numero, alReintentar }: Props) {
  return (
    <div
      className="relative grid w-full overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-paper-dim)"
      style={{ aspectRatio: String(PROPORCION_DE_LA_PORTADA) }}
    >
      {portada.estado === 'listo' ? (
        <Image
          data-compartir-portada=""
          src={portada.dato.url}
          alt={`Vista previa de la cotización n.º ${String(numero)}`}
          fill
          // Una imagen armada ahora (blob:): el optimizador no la toca.
          unoptimized
          sizes="(min-width: 56rem) 54rem, 100vw"
          className="object-contain"
        />
      ) : (
        <RecuadroDeLaPortada
          total={null}
          fallo={portada.estado === 'error'}
          alReintentar={alReintentar}
          textoDelFallo="No se pudo armar la imagen."
        />
      )}
    </div>
  )
}
