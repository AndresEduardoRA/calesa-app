'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { useEffect } from 'react'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { CLAVE_DE_ELIMINAR, PANEL_ETAPAS } from '../../../entities/embudo'
import { CLAVE_DE_LEAD_DEL_EMBUDO } from '../../../entities/embudo-del-lead'
import { CLAVE_DE_EMBUDO, CLAVE_DE_ETAPA } from '../../../entities/tablero'

// «Nuevo embudo» en la URL de la vista (`?panel=nuevo-embudo`).
export const PANEL_NUEVO_EMBUDO = 'nuevo-embudo'

// Un `?lead=` que el servidor no aceptó (no existe o no se ve): se quita de la URL sin otra lectura (lo dibujado ya es el embudo sin filtro).
export function useQuitarLeadIgnorado(ignorado: boolean) {
  const [, setLead] = useQueryState(CLAVE_DE_LEAD_DEL_EMBUDO, parseAsString)
  useEffect(() => {
    if (ignorado) {
      void setLead(null, { history: 'replace', shallow: true })
    }
  }, [ignorado, setLead])
}

// Lo elegido en la vista de embudo, en la URL: el embudo (va al servidor: cambia el kanban; el filtro por lead se conserva), el lead por el
// que se filtra (va al servidor; quitarlo deja el embudo y la etapa), la etapa
// que se ve en el celular (sólo en la pantalla) y el panel abierto (etapas o nuevo embudo; comparte la
// clave con los demás paneles, así nunca se apilan; abrir suma al historial y, tras recargar, «atrás» devuelve el foco a quien lo abrió).
export function useVistaDeEmbudo() {
  const [, setEmbudo] = useQueryState(
    CLAVE_DE_EMBUDO,
    parseAsString.withOptions({ shallow: false }),
  )
  const [etapa, setEtapa] = useQueryState(CLAVE_DE_ETAPA, parseAsString)
  const [, setLead] = useQueryState(
    CLAVE_DE_LEAD_DEL_EMBUDO,
    parseAsString.withOptions({ shallow: false }),
  )
  const [panel, setPanel] = useQueryState(CLAVE_DE_PANEL, parseAsString)
  const [, setEliminar] = useQueryState(CLAVE_DE_ELIMINAR, parseAsString)
  const etapasAbierto = panel === PANEL_ETAPAS
  const nuevoAbierto = panel === PANEL_NUEVO_EMBUDO
  useVueltaDelFoco(CLAVE_DE_PANEL, etapasAbierto || nuevoAbierto)
  return {
    elegirEmbudo: (id: string) => {
      void setEmbudo(id)
      void setEtapa(null)
    },
    quitarLead: () => {
      void setLead(null)
    },
    etapa,
    elegirEtapa: (id: string) => {
      void setEtapa(id)
    },
    etapasAbierto,
    nuevoAbierto,
    abrirEtapas: () => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () => setPanel(PANEL_ETAPAS, { history: 'push' }),
        etapasAbierto,
      )
    },
    abrirNuevo: () => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () => setPanel(PANEL_NUEVO_EMBUDO, { history: 'push' }),
        nuevoAbierto,
      )
    },
    // Cerrar el panel de etapas también cierra su «Eliminar embudo» (`?eliminar=`).
    cerrarPanel: () => {
      void setPanel(null)
      void setEliminar(null)
    },
  }
}
