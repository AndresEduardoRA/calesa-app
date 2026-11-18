// La geometría escalada por un factor (el PDF: 0,75 pt por px y lo que haga entrar la tarjeta en A4, D15 de T310): coordenadas, tamaños de letra y bordes.
// Nunca agranda: quien la pide pasa `min(1, …)`.
import type { Geometria } from './geometria-de-la-tarjeta'

export function escalarGeometria(g: Geometria, k: number): Geometria {
  return {
    ...g,
    ancho: g.ancho * k,
    alto: g.alto * k,
    celdas: g.celdas.map((c) => ({
      ...c,
      x: c.x * k,
      y: c.y * k,
      ancho: c.ancho * k,
      alto: c.alto * k,
      estilo: {
        ...c.estilo,
        tamano: c.estilo.tamano * k,
        bordes: c.estilo.bordes,
      },
    })),
  }
}

// El grosor de un borde escalado: 1 px fino y 2 px grueso, por el factor.
export const grosorEscalado = (grosor: 0 | 1 | 2, k: number): number => grosor * k
