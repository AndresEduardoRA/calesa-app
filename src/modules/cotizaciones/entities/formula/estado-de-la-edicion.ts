import { estadoDeUnaPieza, type EstadoDeLaEdicion } from '@/shared/lib/edicion'
import type { LecturaDeLaFormula } from './versiones'

// El estado de lo guardado de la fórmula de un origen, para la barra de la edición a pantalla completa: su borrador (con quién lo guardó) o, sin él, la publicada.
// Lo no guardado de la planilla lo suma quien la edita.
export function estadoDeLaFormulaGuardada(
  lectura: Pick<LecturaDeLaFormula, 'borrador' | 'publicada'>,
): EstadoDeLaEdicion {
  return estadoDeUnaPieza({
    hayCambios: false,
    borrador: lectura.borrador ? { detalle: lectura.borrador.autor } : null,
    publicada: lectura.publicada ? { version: lectura.publicada.version } : null,
  })
}
