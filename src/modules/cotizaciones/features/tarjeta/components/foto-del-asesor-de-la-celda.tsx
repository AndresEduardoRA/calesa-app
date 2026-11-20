'use client'

import Image from 'next/image'
import { useState, type CSSProperties } from 'react'
import { circuloDeLasIniciales } from '../../../entities/tarjeta/circulo-de-las-iniciales'
import { RELLENO_DE_LA_CELDA } from '../../../entities/tarjeta/estilo-de-la-celda'
import type { CeldaDibujada } from '../../../entities/tarjeta/geometria-de-la-tarjeta'

const POSICION_X = { izquierda: '0%', centro: '50%', derecha: '100%' } as const
const POSICION_Y = { arriba: '0%', centro: '50%', abajo: '100%' } as const

type Props = {
  celda: Pick<CeldaDibujada, 'ancho' | 'alto' | 'estilo'>
  foto: { url: string | null; iniciales: string; nombre: string }
}

// La foto del asesor (quien mira o comparte la tarjeta) en su celda: entera (`contain`) en la caja interior y alineada como la celda, como el logo
// (`<LogoDeLaCelda>`). Sin foto, o si no carga, sus iniciales en un círculo (`circuloDeLasIniciales()`, el mismo del PDF y la imagen) del color del texto de la
// celda. Sin URL (las cifras de ejemplo del editor), una muestra punteada «Foto». El marco tiene el tamaño de la caja desde el principio: cargar no mueve nada.
export function FotoDelAsesorDeLaCelda({ celda, foto }: Props) {
  const [rota, setRota] = useState(false)
  const ancho = Math.max(0, celda.ancho - 2 * RELLENO_DE_LA_CELDA)
  const alto = Math.max(0, celda.alto - 2 * RELLENO_DE_LA_CELDA)
  const marco: CSSProperties = { position: 'relative', width: ancho, height: alto, flexShrink: 0 }
  if (foto.url === '') {
    return (
      <span
        data-foto-de-ejemplo=""
        style={marco}
        className="flex items-center justify-center rounded-(--radius-sm) border border-dashed border-current text-(length:--text-xs) font-medium opacity-60"
      >
        Foto
      </span>
    )
  }
  if (foto.url === null || rota) {
    const c = circuloDeLasIniciales(celda, 1)
    return c === null ? null : (
      <span style={marco} className="block">
        <span
          data-iniciales-del-asesor=""
          role="img"
          aria-label={foto.nombre}
          style={{
            position: 'absolute',
            left: c.x,
            top: c.y,
            width: c.diametro,
            height: c.diametro,
            border: `${String(c.borde)}px solid currentColor`,
            borderRadius: '50%',
            fontSize: c.letra,
            fontWeight: 600,
            fontStyle: 'normal',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {foto.iniciales}
        </span>
      </span>
    )
  }
  return (
    <span style={marco} className="block">
      <Image
        src={foto.url}
        alt={foto.nombre}
        fill
        unoptimized
        sizes={`${String(Math.ceil(ancho))}px`}
        data-foto-del-asesor=""
        style={{
          objectFit: 'contain',
          objectPosition: `${POSICION_X[celda.estilo.alinear]} ${POSICION_Y[celda.estilo.alinearVertical]}`,
        }}
        onError={() => {
          setRota(true)
        }}
      />
    </span>
  )
}
