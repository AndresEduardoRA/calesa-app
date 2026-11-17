'use client'

import { useState } from 'react'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../entities/flujo'
import { contenidoDelPanel, type SeccionDelPanel } from '../../../entities/panel-del-flujo'
import { useFaseAbierta } from './use-fase-abierta'
import { usePanelDelFlujo } from './use-panel-del-flujo'

export type MostradoEnElPanel =
  { tipo: 'fase'; fase: FaseParaConfigurar } | { tipo: 'seccion'; clave: SeccionDelPanel }

const claveDe = (m: MostradoEnElPanel | null) =>
  m === null ? null : m.tipo === 'fase' ? `fase:${m.fase.id}` : `seccion:${m.clave}`

// La misma fase releída (la versión nueva del flujo) también cuenta como cambio: el panel muestra la última.
const cambio = (ahora: MostradoEnElPanel, antes: MostradoEnElPanel | null) =>
  claveDe(ahora) !== claveDe(antes) ||
  (ahora.tipo === 'fase' && antes?.tipo === 'fase' && ahora.fase !== antes.fase)

// Lo pedido por la URL, con la fase leída (una que ya no está en el flujo no abre).
function mostradoAhora(
  pedido: ReturnType<typeof contenidoDelPanel>,
  flujo: FlujoParaConfigurar,
): MostradoEnElPanel | null {
  if (pedido === null) return null
  if (pedido.tipo === 'seccion') return pedido
  const fase = flujo.fases.find((f) => f.id === pedido.faseId)
  return fase ? { tipo: 'fase', fase } : null
}

// Qué muestra el panel del flujo según la URL (gana `?seccion=` sobre `?fase=`; lo que no apunta a nada no abre) y, mientras se cierra con su animación, lo
// último que mostró. Cerrar quita de la URL lo que estaba abierto.
export function useContenidoDelPanel(flujo: FlujoParaConfigurar) {
  const faseAbierta = useFaseAbierta()
  const panel = usePanelDelFlujo()
  const pedido = contenidoDelPanel(
    { seccion: panel.seccion, fase: faseAbierta.texto },
    flujo.fases,
    panel.disponibles,
  )
  const ahora = mostradoAhora(pedido, flujo)
  const [ultimo, setUltimo] = useState(ahora)
  if (ahora !== null && cambio(ahora, ultimo)) {
    setUltimo(ahora)
  }
  const mostrado = ahora ?? ultimo
  return {
    abierto: ahora !== null,
    mostrado,
    faseAbierta: ahora?.tipo === 'fase' ? ahora.fase.id : null,
    abrirFase: faseAbierta.abrir,
    cerrar: mostrado?.tipo === 'seccion' ? panel.cerrar : faseAbierta.cerrar,
  }
}
