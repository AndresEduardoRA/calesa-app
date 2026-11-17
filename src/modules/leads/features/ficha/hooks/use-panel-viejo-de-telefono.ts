'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { useEffect } from 'react'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { CLAVE_DE_EXTRA_EN_PANEL, reemplazoDelPanelViejo } from '../../../entities/telefonos'

const PARAMETROS = { [CLAVE_DE_PANEL]: parseAsString, [CLAVE_DE_EXTRA_EN_PANEL]: parseAsString }

// Un enlace viejo de la ficha con `?panel=agregar-telefono` (el modal vivía en «Datos»): se reemplaza en la URL, sin sumar al historial,
// por la edición con «Agregar teléfono» abierto, o se quita si quien mira no puede agregar teléfonos (`reemplazoDelPanelViejo()`).
export function usePanelViejoDeTelefono(puedeAgregarTelefono: boolean) {
  const [parametros, setParametros] = useQueryStates(PARAMETROS)
  const panel = parametros[CLAVE_DE_PANEL]
  useEffect(() => {
    const reemplazo = reemplazoDelPanelViejo(panel, puedeAgregarTelefono)
    if (reemplazo) {
      void setParametros(
        { [CLAVE_DE_PANEL]: reemplazo.panel, [CLAVE_DE_EXTRA_EN_PANEL]: reemplazo.extra },
        { history: 'replace' },
      )
    }
  }, [panel, puedeAgregarTelefono, setParametros])
}
