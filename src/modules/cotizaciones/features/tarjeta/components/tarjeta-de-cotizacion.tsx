'use client'

import type { CSSProperties } from 'react'
import { COLOR_TINTA } from '@/shared/config/app'
import type { Geometria } from '../../../entities/tarjeta/geometria-de-la-tarjeta'
import { FONDO_AUTOMATICO } from '../../../entities/tarjeta/estilo-de-la-celda'
import { useEscalaDeLaTarjeta } from '../hooks/use-escala-de-la-tarjeta'
import { CeldaDeLaTarjeta } from './celda-de-la-tarjeta'

// La tarjeta de una cotización: lo que el cliente ve. Dibuja una geometría y nada más (no lee, no calcula): un lienzo del ancho de la tarjeta con cada celda en
// posición absoluta, en el DOM en orden de lectura, escalado como una imagen para caber en su contenedor (nunca agranda). Se ve igual en los dos temas: el
// fondo es blanco y la tinta de los tokens se fija a la de la tarjeta.
export function TarjetaDeCotizacion({
  geometria,
  logo,
  alFallarElLogo,
}: {
  geometria: Geometria
  logo: { nombre: string; url: string } | null
  // El logo no cargó: la celda queda vacía y quien dibuja puede avisar.
  alFallarElLogo?: () => void
}) {
  const { ref, escala } = useEscalaDeLaTarjeta(geometria.ancho)
  const lienzo = {
    width: geometria.ancho,
    height: geometria.alto,
    transform: escala === 1 ? undefined : `scale(${String(escala)})`,
    background: FONDO_AUTOMATICO,
    '--color-ink': COLOR_TINTA,
  } as CSSProperties
  return (
    <div
      ref={ref}
      role="group"
      aria-label="Tarjeta de la cotización"
      data-tarjeta-de-cotizacion=""
      {...(geometria.porOmision ? { 'data-por-omision': '' } : {})}
      className="w-full min-w-0 overflow-hidden"
      style={{ height: geometria.alto * escala }}
    >
      <div className="relative origin-top-left" style={lienzo}>
        {geometria.celdas.map((c) => (
          <CeldaDeLaTarjeta
            key={c.id}
            celda={c}
            logo={logo}
            {...(alFallarElLogo ? { alFallarElLogo } : {})}
          />
        ))}
      </div>
    </div>
  )
}
