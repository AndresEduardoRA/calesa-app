'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { avisarExito } from '@/shared/ui/toasts'
import type { DatosDelAviso } from '../../../entities/subasta-cerrada'
import {
  resumenDelRefresco,
  useRefrescoDeSubasta,
  type ResultadoDelRefresco,
} from '../../subasta/hooks/use-refresco-de-subasta'

export type FaseDelRefresco =
  | { tipo: 'reposo' }
  // Consultar a apibara gasta cuota: se pide un toque antes.
  | { tipo: 'confirmando' }
  | { tipo: 'consultando' }
  | { tipo: 'fallo'; fallo: Extract<ResultadoDelRefresco, { ok: false }> }
  // Se consultó y el aviso sigue ahí: la subasta sigue cerrada.
  | { tipo: 'consultada' }

// «Refrescar la subasta» del aviso de la hoja: pedir el toque, consultar, y decir cómo terminó en el mismo aviso. Si la subasta vuelve viva, la
// página deja de dibujar el aviso (la lectura del servidor se vuelve a pedir con `router.refresh()`); si sigue cerrada, lo dice. Un conflicto
// (otra persona editó el vehículo) también recarga la página para tener su versión antes de reintentar.
export function useRefrescoDelAviso(datos: DatosDelAviso) {
  const router = useRouter()
  const [fase, setFase] = useState<FaseDelRefresco>({ tipo: 'reposo' })
  const [actualizando, empezar] = useTransition()
  const { consultar } = useRefrescoDeSubasta({
    vehiculoId: datos.vehiculoId,
    origenId: datos.origenId,
    entrada: datos.entrada ?? '',
    actualizadoEn: datos.actualizadoEn,
    puedeConfigurar: datos.puedeConfigurar,
  })

  async function consultarAhora(): Promise<void> {
    setFase({ tipo: 'consultando' })
    const resultado = await consultar()
    if (resultado === null) {
      return
    }
    if (resultado.ok) {
      avisarExito(resumenDelRefresco(resultado.actualizados, resultado.conservados))
      setFase({ tipo: 'consultada' })
    } else {
      setFase({ tipo: 'fallo', fallo: resultado })
    }
    if (resultado.ok || resultado.conflicto) {
      empezar(() => {
        router.refresh()
      })
    }
  }

  return {
    fase,
    actualizando,
    pedir: () => {
      setFase({ tipo: 'confirmando' })
    },
    cancelar: () => {
      setFase({ tipo: 'reposo' })
    },
    consultar: consultarAhora,
  }
}
