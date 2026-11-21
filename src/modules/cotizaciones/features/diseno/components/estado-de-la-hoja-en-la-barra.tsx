'use client'

import { useEdicionAPantallaCompleta } from '@/shared/ui/edicion-a-pantalla-completa'
import { estadoDeLaHoja } from '../../../entities/diseno/estado-de-la-edicion'
import type { useGuardadoDelDiseno } from '../hooks/use-guardar-diseno'

// El estado de la hoja y sus cambios sin guardar, dichos a la barra de la edición a pantalla completa («Salir» pregunta si los hay). Fuera del modo no hace nada ni dibuja.
export function EstadoDeLaHojaEnLaBarra({
  guardado,
}: {
  guardado: Pick<
    ReturnType<typeof useGuardadoDelDiseno>,
    'hayCambios' | 'versionEditada' | 'limpiar'
  >
}) {
  useEdicionAPantallaCompleta({
    estado: estadoDeLaHoja(guardado.hayCambios, guardado.versionEditada),
    hayCambios: guardado.hayCambios,
    alDescartar: guardado.limpiar,
  })
  return null
}
