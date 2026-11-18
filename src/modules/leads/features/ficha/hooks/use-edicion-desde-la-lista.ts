'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { CLAVE_PARA } from '../../../entities/acciones-de-fila'
import { PANEL_EDITAR_LEAD } from '../../../entities/edicion'

const PARAMETROS = {
  [CLAVE_DE_PANEL]: parseAsString,
  [CLAVE_PARA]: parseAsString,
}

// «Editar lead» desde el «⋯» de la lista o del kanban, en la URL: el panel de edición de la ficha con el lead en `para`
// (`?panel=editar-lead&para=<id>`). Recargar lo reabre y «atrás» lo cierra (tras recargar, con el foco en el «⋯» que lo abrió). Cerrar lo
// hace el panel (`usePanelDeLead().cerrar`, que quita también `para`).
export function useEdicionDesdeLaLista() {
  const [parametros, setParametros] = useQueryStates(PARAMETROS)
  const para = parametros[CLAVE_DE_PANEL] === PANEL_EDITAR_LEAD ? parametros[CLAVE_PARA] : null
  useVueltaDelFoco(CLAVE_DE_PANEL, para !== null)
  return {
    // El id tal como vino en la URL: puede no ser de nadie. Nulo con el panel cerrado.
    para,
    abrir: (leadId: string) => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setParametros(
            { [CLAVE_DE_PANEL]: PANEL_EDITAR_LEAD, [CLAVE_PARA]: leadId },
            { history: 'push' },
          ),
        para === leadId,
      )
    },
    cerrar: () => {
      void setParametros({ [CLAVE_DE_PANEL]: null, [CLAVE_PARA]: null })
    },
  }
}
