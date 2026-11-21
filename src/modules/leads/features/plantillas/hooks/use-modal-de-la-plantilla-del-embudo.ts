'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import type { AjustesDeLeads } from '../../../entities/ajustes-de-leads'
import { etapasIguales, validarEtapas, type Etapa } from '../../../entities/embudo'
import { useEtapasEditables } from '../../embudo/hooks/use-etapas-editables'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { guardarPlantillaDelEmbudo } from '../actions/guardar-plantilla-del-embudo'

const sinId = (etapas: readonly Etapa[]): Etapa[] => etapas.map((etapa) => ({ ...etapa, id: null }))

type Opciones = {
  embudo: AjustesDeLeads['embudo']
  abierto: boolean
  alCerrar: () => void
}

// La plantilla del embudo en su modal: las etapas se editan con el editor del panel del embudo y se guardan juntas, con la versión de la
// plantilla (que llega por props al abrir y nunca va en la `key`). Las reglas se dicen antes de enviar; lo que la base rechaza vuelve junto a la
// lista, y un conflicto ofrece «Recargar». El motivo se va al tocar una etapa. Sin cambios, guardar cierra.
export function useModalDeLaPlantillaDelEmbudo({ embudo, abierto, alCerrar }: Opciones) {
  // Un id local sólo para la `key` de cada fila (el foco sigue a la etapa al moverla); no viaja.
  const [inicial] = useState(() =>
    embudo.etapas.map((etapa) => ({ ...etapa, id: crypto.randomUUID() })),
  )
  // Se editó algo desde el último intento: el motivo de ese intento ya no vale.
  const [editadas, setEditadas] = useState(false)
  const edicion = useEtapasEditables(inicial, () => {
    setEditadas(true)
  })
  const hayCambios = !etapasIguales(sinId(edicion.etapas), embudo.etapas)
  const formulario = useEnvioConVersion({
    abierto,
    hayCambios,
    version: embudo.actualizadoEn,
    validar: () => {
      const motivo = hayCambios ? validarEtapas(edicion.etapas) : null
      return motivo ? { etapas: motivo } : null
    },
    pedir: async () =>
      hayCambios
        ? enviarAccion(
            guardarPlantillaDelEmbudo({
              actualizadoEnEsperado: embudo.actualizadoEn,
              etapas: sinId(edicion.etapas),
            }),
            MENSAJE_DE_VALIDACION,
          )
        : { ok: true, data: { actualizadoEn: embudo.actualizadoEn } },
    alGuardar: () => {
      avisarExito('Plantilla del embudo guardada.')
      alCerrar()
    },
    campoDelRechazo: (error) =>
      error.codigo === 'regla' || error.codigo === 'validacion' ? 'etapas' : null,
  })
  return {
    // Lo que el editor de etapas necesita.
    panel: { ...edicion, enCurso: formulario.enCurso },
    motivo: editadas ? null : (formulario.errores['etapas'] ?? null),
    formulario: {
      ...formulario,
      enviar: () => {
        setEditadas(false)
        return formulario.enviar()
      },
    },
  }
}
