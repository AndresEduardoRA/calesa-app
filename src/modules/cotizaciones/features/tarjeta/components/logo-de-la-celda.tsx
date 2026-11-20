'use client'

import Image from 'next/image'
import { useState, type CSSProperties } from 'react'
import type { EstiloDibujado } from '../../../entities/tarjeta/estilo-de-la-celda'

const POSICION_X = { izquierda: '0%', centro: '50%', derecha: '100%' } as const
const POSICION_Y = { arriba: '0%', centro: '50%', abajo: '100%' } as const

type Props = {
  logo: { nombre: string; url: string }
  // La caja interior de la celda (sin escalar): la celda menos su relleno.
  ancho: number
  alto: number
  estilo: Pick<EstiloDibujado, 'alinear' | 'alinearVertical'>
  // La imagen no cargó (404, archivo roto): la celda queda vacía y quien dibuja puede avisar (el editor de la tarjeta).
  alFallar?: () => void
}

// El logo de la empresa en su celda de la tarjeta: sólo el logo, entero (`contain`) en la caja interior y alineado como la celda, igual que lo ubican el PDF y la
// imagen (`cajaDelLogo()`). El marco tiene el tamaño de la caja desde el principio: cargar no mueve nada. Sin URL (las cifras de ejemplo del editor y de la
// tarjeta en vivo), una muestra punteada «Logo»: así se ve dónde irá.
export function LogoDeLaCelda({ logo, ancho, alto, estilo, alFallar }: Props) {
  const [roto, setRoto] = useState(false)
  const marco: CSSProperties = { position: 'relative', width: ancho, height: alto, flexShrink: 0 }
  if (logo.url === '') {
    return (
      <span
        data-logo-de-ejemplo=""
        style={marco}
        className="flex items-center justify-center rounded-(--radius-sm) border border-dashed border-current text-(length:--text-xs) font-medium opacity-60"
      >
        Logo
      </span>
    )
  }
  if (roto) {
    return null
  }
  return (
    <span style={marco} className="block">
      <Image
        src={logo.url}
        alt={logo.nombre}
        fill
        unoptimized
        sizes={`${String(Math.ceil(ancho))}px`}
        data-logo-de-la-celda=""
        style={{
          objectFit: 'contain',
          objectPosition: `${POSICION_X[estilo.alinear]} ${POSICION_Y[estilo.alinearVertical]}`,
        }}
        onError={() => {
          setRoto(true)
          alFallar?.()
        }}
      />
    </span>
  )
}
