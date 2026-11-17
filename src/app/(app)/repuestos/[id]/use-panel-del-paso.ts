'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { useCallback, useState } from 'react'
import { PARAMETROS_DE_REGISTRAR_PAGO } from '@/modules/logistica/pantallas/dinero-proyecto'
import type { PanelDelPaso } from '@/modules/repuestos/pantallas/flujo-pasos'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { CLAVE_DEL_PANEL_DEL_PASO } from './clave-del-panel'

const PARSERS = {
  [CLAVE_DEL_PANEL_DEL_PASO]: parseAsString,
  panel: parseAsString,
  pago: parseAsString,
}

// El panel abierto bajo los pasos en la URL (`?pestana=`, nuqs con `shallow: false`: el servidor lee y dibuja el panel). El abierto sale de la URL (así responde al
// toque, antes de que llegue la página) y sólo si quien mira puede abrirlo. Elegir otro suelta el formulario que hubiera (`panel`, `pago`); «Registrar pago» abre los
// pagos con su formulario en una sola escritura, que suma al historial («atrás» lo cierra).
export function usePanelDelPaso(disponibles: readonly PanelDelPaso[]) {
  const [valores, escribir] = useQueryStates(PARSERS, { shallow: false })
  const [enfocar, setEnfocar] = useState(false)
  const valor = valores[CLAVE_DEL_PANEL_DEL_PASO]
  const abierto = disponibles.find((p) => p === valor) ?? null
  // «Registrar pago» suma al historial: tras recargar, «atrás» devuelve el foco al botón del ítem que lo abrió (la misma clave que el formulario de pagos).
  useVueltaDelFoco('panel', valores.panel === PARAMETROS_DE_REGISTRAR_PAGO.panel)
  return {
    abierto,
    enfocar,
    yaEnfocado: useCallback(() => {
      setEnfocar(false)
    }, []),
    elegir: (panel: PanelDelPaso | null) => {
      void escribir({ [CLAVE_DEL_PANEL_DEL_PASO]: panel, panel: null, pago: null })
    },
    abrirCotizaciones: () => {
      setEnfocar(true)
      void escribir({ [CLAVE_DEL_PANEL_DEL_PASO]: 'cotizaciones', panel: null, pago: null })
    },
    registrarPago: () => {
      abrirConVuelta('panel', () =>
        escribir(
          { [CLAVE_DEL_PANEL_DEL_PASO]: 'pagos', ...PARAMETROS_DE_REGISTRAR_PAGO },
          { history: 'push' },
        ),
      )
    },
  }
}
