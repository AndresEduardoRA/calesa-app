'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { CLAVE_DEL_VEHICULO_DEL_PANEL } from '../claves'

const PARAMETROS = {
  [CLAVE_DE_PANEL]: parseAsString,
  [CLAVE_DEL_VEHICULO_DEL_PANEL]: parseAsString,
}

// Un panel del «⋯» del vehículo en la URL: `?panel=<panel>&para=<id>` en el inventario (un solo hook por panel y por lista: las filas reciben `abrir`)
// y `?panel=<panel>` en la ficha (`abrir()` sin id). Abrir suma al historial («atrás» lo cierra; tras recargar devuelve el foco al «⋯»:
// `vuelta-del-foco.ts`); cerrar lo reemplaza. Con `shallow: false` el servidor lee lo que el panel muestra (las fotos, la vitrina) al abrirse y vuelve a
// dibujar la pantalla al cerrarse.
export function usePanelConVehiculo(panel: string, { shallow }: { shallow: boolean }) {
  const [valores, escribir] = useQueryStates(PARAMETROS, { shallow })
  const abierto = valores[CLAVE_DE_PANEL] === panel
  useVueltaDelFoco(CLAVE_DE_PANEL, abierto)
  return {
    abierto,
    // El vehículo que nombra la URL (sólo en el inventario); null en la ficha o si falta.
    para: abierto ? (valores[CLAVE_DEL_VEHICULO_DEL_PANEL] ?? null) : null,
    abrir: (id?: string) => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          escribir(
            { [CLAVE_DE_PANEL]: panel, [CLAVE_DEL_VEHICULO_DEL_PANEL]: id ?? null },
            { history: 'push' },
          ),
        abierto && (id === undefined || valores[CLAVE_DEL_VEHICULO_DEL_PANEL] === id),
      )
    },
    cerrar: () => {
      void escribir({ [CLAVE_DE_PANEL]: null, [CLAVE_DEL_VEHICULO_DEL_PANEL]: null })
    },
  }
}
