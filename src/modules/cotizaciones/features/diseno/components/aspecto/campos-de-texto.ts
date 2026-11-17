import { ASPECTO_POR_DEFECTO, type Enfasis, type Letra } from '../../../../entities/diseno'
import type { CampoDeEscala } from './campos-de-escala'
import { OPCIONES_DE_ENFASIS, OPCIONES_DE_LETRA } from './etiquetas-del-aspecto'

// La letra y el énfasis de cualquier pieza: los dos últimos selects de su «Aspecto».
export function camposDeTexto(
  pieza: { letra?: Letra | undefined; enfasis?: Enfasis | undefined },
  alPoner: (cambios: { letra?: Letra; enfasis?: Enfasis }) => void,
): CampoDeEscala[] {
  return [
    {
      clave: 'letra',
      etiqueta: 'Letra',
      opciones: OPCIONES_DE_LETRA,
      valor: pieza.letra ?? ASPECTO_POR_DEFECTO.letra,
      alElegir: (v) => {
        alPoner({ letra: v as Letra })
      },
    },
    {
      clave: 'enfasis',
      etiqueta: 'Énfasis',
      opciones: OPCIONES_DE_ENFASIS,
      valor: pieza.enfasis ?? ASPECTO_POR_DEFECTO.enfasis,
      alElegir: (v) => {
        alPoner({ enfasis: v as Enfasis })
      },
    },
  ]
}
