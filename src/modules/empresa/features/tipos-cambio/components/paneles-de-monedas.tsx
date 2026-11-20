'use client'

import {
  parDeLaClave,
  type CambioDeValor,
  type Moneda,
  type TipoCambio,
} from '../../../entities/tipos-cambio'
import type { NavegacionDeMonedas } from '../hooks/use-navegacion-de-monedas'
import type { EdicionesDeTiposCambio } from '../hooks/use-tipos-cambio'
import { PanelMoneda } from './panel-moneda'
import { PanelNuevoTipoCambio } from './panel-nuevo-tipo-cambio'
import { PanelTipoCambio } from './panel-tipo-cambio'

export const PANEL_TIPO = 'nuevo-tipo-cambio'
export const PANEL_MONEDA = 'nueva-moneda'

type Props = {
  navegacion: NavegacionDeMonedas
  tipos: readonly TipoCambio[]
  // Todas, y las activas (entre ellas se elige al crear un tipo de cambio).
  monedas: readonly Moneda[]
  activas: readonly Moneda[]
  monedaBase: string
  historial: readonly CambioDeValor[] | null
  puedeGestionar: boolean
  ediciones: EdicionesDeTiposCambio
}

// Los paneles de la pantalla, cada uno con su URL: el tipo de cambio (`?tc=`), crear uno (`?panel=nuevo-tipo-cambio`, con `?par=`) y la moneda
// (`?moneda=` o `?panel=nueva-moneda`).
export function PanelesDeMonedas({
  navegacion,
  tipos,
  monedas,
  activas,
  monedaBase,
  historial,
  puedeGestionar,
  ediciones,
}: Props) {
  const { tc, moneda, panel, par, cerrar } = navegacion
  const monedaAbierta =
    panel === PANEL_MONEDA ? 'nueva' : (monedas.find((una) => una.codigo === moneda) ?? null)
  return (
    <>
      <PanelTipoCambio
        tipo={tipos.find((tipo) => tipo.id === tc) ?? null}
        tipos={tipos}
        historial={puedeGestionar ? (historial ?? []) : null}
        puedeGestionar={puedeGestionar}
        ediciones={ediciones}
        alCerrar={cerrar}
      />
      <PanelNuevoTipoCambio
        abierto={panel === PANEL_TIPO && puedeGestionar}
        monedas={activas}
        monedaBase={monedaBase}
        par={parDeLaClave(par)}
        ediciones={ediciones}
        alCerrar={cerrar}
      />
      <PanelMoneda
        moneda={monedaAbierta === 'nueva' && !puedeGestionar ? null : monedaAbierta}
        monedaBase={monedaBase}
        puedeGestionar={puedeGestionar}
        ediciones={ediciones}
        alCerrar={cerrar}
      />
    </>
  )
}
