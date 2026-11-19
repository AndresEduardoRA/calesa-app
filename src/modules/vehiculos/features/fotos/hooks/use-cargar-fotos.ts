'use client'

import { useCallback } from 'react'
import { urlPublica } from '@/shared/lib/almacen'
import type { CargaDeImagenes, ImagenDelVisor } from '@/shared/ui/visor-de-imagenes'
import { leerFotosEnElLugar } from '../../../composicion-fotos.client'

// Cómo se leen las fotos de un vehículo para el visor, la tira y la ficha completa: una sola lectura de a lo sumo 24 (`leerFotosEnElLugar`), con la
// miniatura de 480 px y la grande (≤ 1600 px, sólo se pide al verla en grande). Nulo = no se pudo leer.
export function useCargarFotos(vehiculoId: string): CargaDeImagenes {
  return useCallback(async (): Promise<readonly ImagenDelVisor[] | null> => {
    const leidas = await leerFotosEnElLugar(vehiculoId)
    if (!leidas.ok) return null
    return leidas.data.map((foto) => ({
      id: foto.id,
      miniatura: urlPublica('vehiculos', foto.rutaMiniatura),
      grande: urlPublica('vehiculos', foto.ruta),
    }))
  }, [vehiculoId])
}
