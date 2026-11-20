// El círculo con las iniciales del asesor en la celda «Foto del asesor» cuando no tiene foto (o no carga): el diámetro es el lado menor de la caja interior (la celda
// menos `RELLENO_DE_LA_CELDA` por lado), alineado como la celda, con un borde de 1,5 px y la letra al 40 % del diámetro. Lo dibujan igual el HTML, la imagen y el PDF.
import { RELLENO_DE_LA_CELDA } from './estilo-de-la-celda'
import type { CeldaDibujada } from './geometria-de-la-tarjeta'

export const BORDE_DEL_CIRCULO = 1.5
export const LETRA_DEL_CIRCULO = 0.4

export type CirculoDeLasIniciales = {
  // La caja interior, relativa a la esquina de la celda, y el círculo, relativo a la caja.
  interior: { ancho: number; alto: number }
  x: number
  y: number
  diametro: number
  borde: number
  letra: number
}

const FRACCION = { izquierda: 0, centro: 0.5, derecha: 1, arriba: 0, abajo: 1 } as const

// `k`: el factor con que la celda ya viene escalada (1 en el HTML y la imagen; los pt por px del PDF). Nulo si la caja mide 0 o menos.
export function circuloDeLasIniciales(
  celda: Pick<CeldaDibujada, 'ancho' | 'alto' | 'estilo'>,
  k: number,
): CirculoDeLasIniciales | null {
  const ancho = celda.ancho - 2 * RELLENO_DE_LA_CELDA * k
  const alto = celda.alto - 2 * RELLENO_DE_LA_CELDA * k
  if (ancho <= 0 || alto <= 0) {
    return null
  }
  const diametro = Math.min(ancho, alto)
  return {
    interior: { ancho, alto },
    x: (ancho - diametro) * FRACCION[celda.estilo.alinear],
    y: (alto - diametro) * FRACCION[celda.estilo.alinearVertical],
    diametro,
    borde: BORDE_DEL_CIRCULO * k,
    letra: diametro * LETRA_DEL_CIRCULO,
  }
}
