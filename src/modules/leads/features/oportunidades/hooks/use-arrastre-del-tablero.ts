'use client'

import {
  KeyboardSensor,
  MouseSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useState } from 'react'
import { coordenadasDelTeclado } from '../components/coordenadas-del-teclado'
import type { EtapaGuardada } from '../../../entities/embudo'
import type { OportunidadDelLead } from '../../../entities/oportunidad'
import { etapaDeDestino } from '../../../entities/tablero-del-lead'

type Entrada = {
  etapas: readonly EtapaGuardada[]
  // Las que se dibujan: lo único que se puede tomar.
  lista: readonly OportunidadDelLead[]
  alMover: (o: OportunidadDelLead, etapa: EtapaGuardada, motivo: string | null) => Promise<boolean>
  alPedirMotivo: (o: OportunidadDelLead, etapa: EtapaGuardada) => void
}

// El arrastre del embudo del lead: los sensores (el mouse arrastra a partir de 5 px, así un clic en el «⋯» no arranca nada; el teclado va de
// columna en columna), la tarjeta en el aire y qué hacer al soltarla: otra etapa abierta o ganada la mueve ya; una perdida pide el motivo; donde
// estaba, o fuera de toda columna, nada.
export function useArrastreDelTablero({ etapas, lista, alMover, alPedirMotivo }: Entrada) {
  const [tomada, setTomada] = useState<OportunidadDelLead | null>(null)
  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: coordenadasDelTeclado(etapas) }),
  )
  return {
    sensores,
    tomada,
    alTomar: ({ active }: DragStartEvent) => {
      setTomada(lista.find((o) => o.id === String(active.id)) ?? null)
    },
    alCancelar: () => {
      setTomada(null)
    },
    alSoltar: ({ active, over }: DragEndEvent) => {
      setTomada(null)
      const o = lista.find((x) => x.id === String(active.id))
      const destino = o ? etapaDeDestino(o, etapas, over ? String(over.id) : null) : null
      if (!o || !destino) {
        return
      }
      if (destino.esPerdida) {
        alPedirMotivo(o, destino)
        return
      }
      void alMover(o, destino, null)
    },
  }
}
