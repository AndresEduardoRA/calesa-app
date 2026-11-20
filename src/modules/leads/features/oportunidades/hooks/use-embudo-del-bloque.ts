'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { CLAVE_DE_EMBUDO_DE_LA_FICHA, guardarPreferencia } from '@/modules/equipo/client'
import { avisarError } from '@/shared/ui/toasts'
import type { Embudo } from '../../../entities/embudo'
import { embudoDeLaFicha } from '../../../entities/tablero-del-lead'

// El embudo que ve el bloque «Oportunidades»: el que elige ahora, si no el que dejó la última vez (`leads.embudo_de_la_ficha`, por persona: lo trae la
// página), si no el de por defecto. Elegir uno lo cambia enseguida y lo recuerda; si no se pudo guardar, igual cambió en esta pestaña y sólo se avisa lo
// que la persona tiene que saber (su sesión venció).
export function useEmbudoDelBloque(embudos: readonly Embudo[], recordado: string | null) {
  const [elegido, setElegido] = useState<string | null>(null)
  const { execute } = useAction(guardarPreferencia, {
    onError: ({ error }) => {
      if (error.serverError) {
        avisarError(error.serverError)
      }
    },
  })
  const embudo = embudoDeLaFicha(embudos, elegido, recordado)
  return {
    embudo,
    elegir: (id: string) => {
      setElegido(id)
      execute({ clave: CLAVE_DE_EMBUDO_DE_LA_FICHA, valor: id })
    },
  }
}
