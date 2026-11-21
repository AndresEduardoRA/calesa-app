import { estadoDeUnaPieza, type EstadoDeLaEdicion } from '@/shared/lib/edicion'

// El estado de la hoja (el diseño de una versión) para la barra de la edición a pantalla completa: lo no guardado manda; si no, la versión que se edita es el borrador o
// la publicada (su número no viene en la lectura del diseño).
export function estadoDeLaHoja(
  hayCambios: boolean,
  version: 'borrador' | 'publicada',
): EstadoDeLaEdicion {
  return estadoDeUnaPieza({
    hayCambios,
    borrador: version === 'borrador' ? {} : null,
    publicada: version === 'publicada' ? {} : null,
  })
}
