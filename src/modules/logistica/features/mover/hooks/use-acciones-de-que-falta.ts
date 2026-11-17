'use client'

import { useId } from 'react'
import { useEnLinea } from '@/shared/ui/use-en-linea'
import type { AccionesDelRequisito } from '../../../entities/mover/accion-de-requisito'
import type { AccionADibujar, LugarDeLasAcciones } from '../../../entities/mover/acciones-a-dibujar'
import {
  HUECOS_DE_ACCION,
  type HuecoDeAccion,
} from '../../../entities/mover/capacidades-de-que-falta'
import type { UnidadAbierta } from '../../../entities/nucleo/unidad'
import { useEnLaPagina } from '../../nucleo/disposicion'
import { useHuecosQueHay } from '../../nucleo/hooks/eventos-de-la-unidad'
import { useHacerAccionDelRequisito } from './use-hacer-accion-del-requisito'

const SIN_HUECOS: readonly string[] = []
const siempre = () => true
const soloDocumentos = (hueco: HuecoDeAccion) => hueco === 'documentos'

export type AccionesDeQueFalta = {
  resueltas: Readonly<Record<string, AccionesDelRequisito>>
  lugar: LugarDeLasAcciones
  hacer: (accion: AccionADibujar, requisitoId: string) => void
  idSinConexion: string
  enLinea: boolean
}

// Lo que «Qué falta» necesita para dibujar las acciones de sus requisitos: las resueltas de la lectura y lo que sólo sabe el navegador (qué huecos hay, si está en la
// página o en un drawer, si hay red). Una lectura del DOM para todos los botones. `enLaFicha` (la ficha del vehículo): no se mira el DOM; todo hueco de la
// unidad cuenta como existente (la regla apagada de un flujo no se sabe ahí) y sólo «Documentos» está a mano: lo demás lleva a ese hueco de la unidad.
export function useAccionesDeQueFalta(
  unidad: UnidadAbierta,
  resueltas: Readonly<Record<string, AccionesDelRequisito>>,
  enLaFicha = false,
): AccionesDeQueFalta {
  const huecos = useHuecosQueHay(enLaFicha ? SIN_HUECOS : HUECOS_DE_ACCION)
  const enLaPagina = useEnLaPagina() || enLaFicha
  const enLinea = useEnLinea()
  const hacer = useHacerAccionDelRequisito()
  const idSinConexion = useId()
  return {
    resueltas,
    lugar: {
      hayHueco: enLaFicha ? siempre : (hueco: HuecoDeAccion) => huecos.has(hueco),
      ...(enLaFicha ? { aMano: soloDocumentos } : {}),
      enLaPagina,
      unidad: { tipo: unidad.tipo, id: unidad.id, proyecto: unidad.proyecto ?? null },
      enLinea,
    },
    hacer,
    idSinConexion,
    enLinea,
  }
}
