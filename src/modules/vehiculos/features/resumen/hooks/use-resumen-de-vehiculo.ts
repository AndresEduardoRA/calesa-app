'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { useEffect } from 'react'
import { CLAVE_DEL_VISOR } from '@/shared/ui/visor-de-imagenes'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import {
  CLAVE_DE_PESTANA,
  CLAVE_DE_RESUMEN,
  destinoDeLaPestanaVieja,
} from '../../../entities/resumen'
import { CLAVE_DE_EDICION } from '../../alta/claves'

// La foto que abre el visor (`?foto=1`, la clave del carrusel de `shared`).
const CLAVE_DE_LA_FOTO = 'foto'

const PARAMETROS = {
  [CLAVE_DE_RESUMEN]: parseAsString,
  [CLAVE_DE_PESTANA]: parseAsString,
  [CLAVE_DE_EDICION]: parseAsString,
  [CLAVE_DEL_VISOR]: parseAsString,
  [CLAVE_DE_LA_FOTO]: parseAsString,
}

// Qué vehículo está abierto en el resumen, en la URL (`?vehiculo=`): sobrevive a recargar y se puede compartir. Abrir suma al historial
// («atrás» lo cierra). Sin `shallow: false`: abrirlo no pide nada al servidor; el resumen se dibuja con la fila de la página y lee lo suyo por
// su cuenta. `editando` dice que el panel de edición está encima (`?editar=`): mientras tanto el resumen no vuelve a leer. Un `?pestana=` viejo
// se reemplaza sin sumar al historial: `fotos` abre el visor del carrusel del resumen y lo demás sólo se quita. Tras recargar con el resumen
// abierto, «atrás» devuelve el foco a quien lo abrió (`vuelta-del-foco.ts`).
export function useResumenDeVehiculo() {
  const [parametros, setParametros] = useQueryStates(PARAMETROS)
  const id = parametros[CLAVE_DE_RESUMEN]
  const pestana = parametros[CLAVE_DE_PESTANA]
  useVueltaDelFoco(CLAVE_DE_RESUMEN, id !== null)
  useEffect(() => {
    const destino = id === null ? null : destinoDeLaPestanaVieja(pestana, id)
    if (destino === null) return
    void setParametros(
      destino.visor === null
        ? { [CLAVE_DE_PESTANA]: null }
        : { [CLAVE_DE_PESTANA]: null, [CLAVE_DEL_VISOR]: destino.visor, [CLAVE_DE_LA_FOTO]: '1' },
      { history: 'replace' },
    )
  }, [id, pestana, setParametros])
  return {
    id,
    editando: parametros[CLAVE_DE_EDICION] !== null,
    abrir: (vehiculoId: string) => {
      abrirConVuelta(
        CLAVE_DE_RESUMEN,
        () =>
          setParametros(
            { [CLAVE_DE_RESUMEN]: vehiculoId, [CLAVE_DE_PESTANA]: null },
            { history: 'push' },
          ),
        id === vehiculoId,
      )
    },
    cerrar: () => {
      void setParametros({ [CLAVE_DE_RESUMEN]: null, [CLAVE_DE_PESTANA]: null })
    },
  }
}
