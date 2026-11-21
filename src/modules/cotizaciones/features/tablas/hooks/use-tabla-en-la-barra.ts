'use client'

import { useEdicionAPantallaCompleta } from '@/shared/ui/edicion-a-pantalla-completa'
import { estadoDeLaTabla } from '../../../entities/tablas/estado-de-la-edicion'
import type { TablaDeReferencia } from '../../../entities/tablas/lectura'

// Lo que la barra de la edición a pantalla completa sabe de la tabla abierta: su estado, y que «Salir» pregunta si hay cambios sin publicar (los tira
// `alTirar`: borra el borrador de la pestaña). Fuera del modo no hace nada.
export function useTablaEnLaBarra(
  tabla: Pick<TablaDeReferencia, 'version' | 'publicadoPor'>,
  cambios: boolean,
  alTirar: () => void,
) {
  useEdicionAPantallaCompleta({
    estado: estadoDeLaTabla({ cambios, version: tabla.version, publicadoPor: tabla.publicadoPor }),
    hayCambios: cambios,
    alDescartar: alTirar,
  })
}
