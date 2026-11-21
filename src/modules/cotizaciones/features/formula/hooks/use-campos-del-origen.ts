'use client'

import { useLecturaAlMontar } from '@/shared/ui/use-lectura-al-montar'
import { leerClavesDeLosCampos } from '../../../areas/formula/composicion.client'

// Las claves de los campos propios del origen, leídas al abrir «Tipo de celda › Dato del vehículo» (las comunes no se leen: son `CAMPOS_COMUNES`).
export function useCamposDelOrigen(origenId: string) {
  return useLecturaAlMontar(() => leerClavesDeLosCampos(origenId), origenId)
}
