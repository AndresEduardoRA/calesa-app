// Dónde va el logo de la empresa en su celda de la tarjeta: la caja interior (la celda menos `RELLENO_DE_LA_CELDA` por lado, con el borde adentro) y, dentro de
// ella, el rectángulo del logo entero (`contain`: lo más grande que entra sin recortar ni deformar), alineado por `alinear` y `alinearVertical` de la celda.
// Lo usan el PDF y la imagen de la tarjeta, que no tienen un `object-position` confiable; el HTML dibuja lo mismo con `object-fit` y `object-position`.
import { RELLENO_DE_LA_CELDA } from './estilo-de-la-celda'
import type { CeldaDibujada } from './geometria-de-la-tarjeta'

export type Rectangulo = { x: number; y: number; ancho: number; alto: number }

// La caja interior, relativa a la esquina de la celda, y el logo, relativo a la caja.
export type CajaDelLogo = { interior: { ancho: number; alto: number }; logo: Rectangulo }

const FRACCION = { izquierda: 0, centro: 0.5, derecha: 1, arriba: 0, abajo: 1 } as const

// `k`: el factor con que la celda ya viene escalada (1 en la imagen; 0,75 pt por px por la escala de la página en el PDF). Nulo si algo mide 0 o menos.
export function cajaDelLogo(
  celda: Pick<CeldaDibujada, 'ancho' | 'alto' | 'estilo'>,
  k: number,
  intrinseco: { ancho: number; alto: number },
): CajaDelLogo | null {
  const ancho = celda.ancho - 2 * RELLENO_DE_LA_CELDA * k
  const alto = celda.alto - 2 * RELLENO_DE_LA_CELDA * k
  if (ancho <= 0 || alto <= 0 || intrinseco.ancho <= 0 || intrinseco.alto <= 0) {
    return null
  }
  const escala = Math.min(ancho / intrinseco.ancho, alto / intrinseco.alto)
  const logo = { ancho: intrinseco.ancho * escala, alto: intrinseco.alto * escala }
  return {
    interior: { ancho, alto },
    logo: {
      x: (ancho - logo.ancho) * FRACCION[celda.estilo.alinear],
      y: (alto - logo.alto) * FRACCION[celda.estilo.alinearVertical],
      ...logo,
    },
  }
}
