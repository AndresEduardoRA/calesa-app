'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { useEffect, useState } from 'react'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { recordarQuienAbre } from '@/shared/ui/foco-de-quien-abre'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { PANEL_EDITAR_LEAD } from '../../../entities/edicion'
import {
  CLAVE_DE_SEGUIMIENTO,
  PANEL_ANOTAR_SEGUIMIENTO,
} from '../../../entities/edicion-de-seguimiento'
import { hayModalEnElResumen } from '../../../entities/rapido'
import { PANEL_OPORTUNIDAD_RAPIDA } from '../../../entities/oportunidad-rapida'
import { CLAVE_DE_RECORDATORIO, PANEL_AGENDAR_RECORDATORIO } from '../../../entities/recordatorios'
import { CLAVE_DE_EXTRA_EN_PANEL, VALOR_DE_EXTRA_NUEVO } from '../../../entities/telefonos'

// Qué lead está abierto en el drawer rápido, en la URL (`?lead=`): sobrevive a recargar y se puede compartir. Abrir suma al historial
// («atrás» lo cierra). Lo que se abre encima (editar, anotar, agendar, nueva oportunidad) va en `?panel=`. Tras recargar, «atrás» devuelve el
// foco a quien abrió el drawer o su panel (dos claves: `lead` y `panel`). Sin `shallow: false`: abrirlo no pide nada al servidor; el drawer lee su lead por su cuenta.
export const CLAVE_DE_LEAD = 'lead'

const PARAMETROS = {
  [CLAVE_DE_LEAD]: parseAsString,
  [CLAVE_DE_PANEL]: parseAsString,
  [CLAVE_DE_SEGUIMIENTO]: parseAsString,
  [CLAVE_DE_RECORDATORIO]: parseAsString,
  [CLAVE_DE_EXTRA_EN_PANEL]: parseAsString,
}

// Lo de adentro que se va con el drawer (un modal que quedó en la URL no salta al volver a abrirlo).
const SIN_MODAL = {
  [CLAVE_DE_PANEL]: null,
  [CLAVE_DE_SEGUIMIENTO]: null,
  [CLAVE_DE_RECORDATORIO]: null,
}

export function useDrawerDeLead() {
  const [parametros, setParametros] = useQueryStates(PARAMETROS)
  const id = parametros[CLAVE_DE_LEAD]
  const panel = parametros[CLAVE_DE_PANEL]
  const conModal = hayModalEnElResumen(panel)
  const editando = parametros[CLAVE_DE_PANEL] === PANEL_EDITAR_LEAD
  // Montado con un panel encima (tras recargar), la ficha de `lead` no está en la entrada del panel: el hook se ve «cerrado» para `lead` hasta que
  // queda sin panel, y entonces toma la ficha de esa entrada (la del primer «atrás»). Sin recargar no cambia nada: abrir un panel no olvida la ficha
  // (4-59).
  const [esperaSinPanel, setEsperaSinPanel] = useState(parametros[CLAVE_DE_PANEL] !== null)
  if (esperaSinPanel && parametros[CLAVE_DE_PANEL] === null) {
    setEsperaSinPanel(false)
  }
  // `?lead=<id>&extra=nuevo` (el enlace de cuando el resumen agregaba extras) abre el panel de edición, donde está «Agregar teléfono».
  const extraPedido = parametros[CLAVE_DE_EXTRA_EN_PANEL] === VALOR_DE_EXTRA_NUEVO
  const sinPanel = parametros[CLAVE_DE_PANEL] === null
  useEffect(() => {
    if (id !== null && extraPedido && sinPanel) {
      void setParametros({ [CLAVE_DE_PANEL]: PANEL_EDITAR_LEAD }, { history: 'replace' })
    }
  }, [id, extraPedido, sinPanel, setParametros])
  useVueltaDelFoco(CLAVE_DE_LEAD, id !== null && !esperaSinPanel)
  useVueltaDelFoco(CLAVE_DE_PANEL, editando || conModal)
  return {
    id,
    // Un modal abierto encima: el drawer no vuelve a leer su lead.
    conModal,
    // «Anotar seguimiento…» o «Agendar recordatorio…» del «⋯» está abierto dentro del drawer.
    accion:
      id === null
        ? null
        : panel === PANEL_ANOTAR_SEGUIMIENTO
          ? ('anotar' as const)
          : panel === PANEL_AGENDAR_RECORDATORIO
            ? ('agendar' as const)
            : null,
    // «Nueva oportunidad…» está encima del resumen (`?lead=<id>&panel=oportunidad-rapida`).
    nuevaOportunidad: id !== null && parametros[CLAVE_DE_PANEL] === PANEL_OPORTUNIDAD_RAPIDA,
    cerrarModal: () => {
      void setParametros({ [CLAVE_DE_PANEL]: null })
    },
    // El panel de edición está encima del resumen (`?panel=editar-lead`).
    editando,
    editar: () => {
      recordarQuienAbre()
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () => setParametros({ [CLAVE_DE_PANEL]: PANEL_EDITAR_LEAD }, { history: 'push' }),
        editando,
      )
    },
    // Abrir un modal del «⋯» encima del resumen (anotar, agendar, nueva oportunidad), con el id de lo que se edita vacío.
    abrirModal: (modal: string) => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setParametros(
            {
              [CLAVE_DE_PANEL]: modal,
              [CLAVE_DE_SEGUIMIENTO]: null,
              [CLAVE_DE_RECORDATORIO]: null,
            },
            { history: 'push' },
          ),
        panel === modal,
      )
    },
    abrir: (leadId: string) => {
      abrirConVuelta(
        CLAVE_DE_LEAD,
        () => setParametros({ [CLAVE_DE_LEAD]: leadId }, { history: 'push' }),
        id === leadId,
      )
    },
    cerrar: () => {
      void setParametros({ [CLAVE_DE_LEAD]: null, ...SIN_MODAL })
    },
  }
}
