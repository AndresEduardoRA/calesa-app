'use client'

import { useState } from 'react'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { AccionDeRelacionados } from '../../../entities/acciones-de-relacionados'
import { CLAVE_DE_LUEGO } from '../../../entities/avisos-de-vehiculo'
import { PANEL_DESVINCULAR } from '../../../entities/vehiculos-del-lead'
import type { Envio } from '@/shared/lib/enviar-accion'

export const PANEL_VINCULAR_LEAD = 'vincular-lead'
export const PANEL_MARCAR_INTERESADO = 'marcar-interesado'

type ClaveDeSelector = typeof PANEL_VINCULAR_LEAD | typeof PANEL_MARCAR_INTERESADO

// Lo que se abre por la URL en la ficha del vehículo (y en la unidad de logística): la confirmación de «Desvincular» (`?panel=desvincular`) y los dos selectores de leads
// (`?panel=vincular-lead`, `?panel=marcar-interesado`). Elegir un lead lo resuelve `elegir`: si sale cierra el panel; si no, el panel sigue abierto con el motivo.
export function usePanelesDeLaFicha(elegir: {
  vincularA: (leadId: string) => Promise<Envio<unknown>> | null
  marcarA: (leadId: string) => Promise<Envio<unknown>> | null
}) {
  const desvincular = usePanelPorUrl(PANEL_DESVINCULAR, [CLAVE_DE_LUEGO])
  const vincular = usePanelPorUrl(PANEL_VINCULAR_LEAD)
  const marcar = usePanelPorUrl(PANEL_MARCAR_INTERESADO)
  const montarVincular = useAbiertoAlgunaVez(vincular.abierto)
  const montarMarcar = useAbiertoAlgunaVez(marcar.abierto)
  const [error, setError] = useState<{ panel: ClaveDeSelector; mensaje: string } | null>(null)
  const paneles = { [PANEL_VINCULAR_LEAD]: vincular, [PANEL_MARCAR_INTERESADO]: marcar }

  async function elegirLead(clave: ClaveDeSelector, leadId: string) {
    setError(null)
    const envio = await (clave === PANEL_VINCULAR_LEAD
      ? elegir.vincularA(leadId)
      : elegir.marcarA(leadId))
    if (envio === null) {
      return
    }
    if (envio.ok) {
      paneles[clave].cerrar()
    } else {
      setError({ panel: clave, mensaje: envio.error.mensaje })
    }
  }

  const selector = (clave: ClaveDeSelector, montado: boolean) => ({
    montado,
    abierto: paneles[clave].abierto,
    cerrar: () => {
      setError(null)
      paneles[clave].cerrar()
    },
    error: error?.panel === clave ? error.mensaje : null,
    elegir: (leadId: string) => elegirLead(clave, leadId),
  })

  return {
    // La acción que abre algo por la URL.
    abrir: (accion: AccionDeRelacionados) => {
      setError(null)
      if (accion.tipo === 'elegir-lead') {
        paneles[
          accion.clave === PANEL_VINCULAR_LEAD ? PANEL_VINCULAR_LEAD : PANEL_MARCAR_INTERESADO
        ].abrir()
      } else if (accion.tipo === 'desvincular') {
        desvincular.abrir()
      }
    },
    vincular: selector(PANEL_VINCULAR_LEAD, montarVincular),
    marcar: selector(PANEL_MARCAR_INTERESADO, montarMarcar),
  }
}
