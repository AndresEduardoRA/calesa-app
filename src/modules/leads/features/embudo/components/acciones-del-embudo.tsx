'use client'

import { PlusIcon, Settings2Icon } from 'lucide-react'
import { CLASE_DE_OPCION, useVistaYOpciones } from '@/shared/ui/vista-y-opciones'

type Props = { alAbrirEtapas: () => void; alAbrirNuevo: () => void }

// «Etapas…» y «Nuevo embudo…», en el grupo «Embudo» de «Vista y opciones»: configuran la vista. Cada panel se abre cuando «Vista y opciones»
// terminó de cerrarse, con el foco ya en su botón (al cerrar el panel nuevo, el foco vuelve ahí).
export function AccionesDelEmbudo({ alAbrirEtapas, alAbrirNuevo }: Props) {
  const panel = useVistaYOpciones()
  return (
    <>
      <button
        type="button"
        className={CLASE_DE_OPCION}
        onClick={() => {
          panel.cerrarYLuego(alAbrirEtapas)
        }}
      >
        <Settings2Icon aria-hidden />
        Etapas…
      </button>
      <button
        type="button"
        className={CLASE_DE_OPCION}
        onClick={() => {
          panel.cerrarYLuego(alAbrirNuevo)
        }}
      >
        <PlusIcon aria-hidden />
        Nuevo embudo…
      </button>
    </>
  )
}
