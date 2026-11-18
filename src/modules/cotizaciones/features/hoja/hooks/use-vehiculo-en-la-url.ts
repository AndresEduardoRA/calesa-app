'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { useCallback } from 'react'
import { CLAVE_DE_VEHICULO } from '../../../entities/ruta-de-la-hoja'

// El vehículo elegido para cambiar el de una guardada (T315) vive en `?vehiculo=`: lo escribe el panel del vehículo con `nuqs`, así que soltarlo también va por `nuqs` (nunca
// con el router: el panel no se enteraría). `soltar` reemplaza la entrada y dice si estaba: tras guardar, sin ir al servidor (`shallow`: la versión nueva ya llegó con ese
// vehículo); al recargar, yendo (la página vuelve sin él).
export function useSoltarElVehiculo(): (opciones: { shallow: boolean }) => boolean {
  const [vehiculo, escribir] = useQueryState(CLAVE_DE_VEHICULO, parseAsString)
  return useCallback(
    ({ shallow }) => {
      if (vehiculo === null) {
        return false
      }
      void escribir(null, { history: 'replace', shallow })
      return true
    },
    [vehiculo, escribir],
  )
}
