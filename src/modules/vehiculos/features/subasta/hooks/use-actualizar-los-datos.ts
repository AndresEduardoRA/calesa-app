'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { avisar, avisarError, avisarExito } from '@/shared/ui/toasts'
import { SIN_ENTRADA_PARA_CONSULTAR } from '../../../entities/ofertas-del-menu-de-vehiculo'
import { entradaDeRefresco } from '../../../entities/subasta'
import { RUTA_DE_INTEGRACIONES } from '../ruta'
import { useFotosDeSubasta } from './use-fotos-de-subasta'
import {
  resumenDelRefresco,
  useRefrescoDeSubasta,
  type ResultadoDelRefresco,
} from './use-refresco-de-subasta'

export const PEDIDO_DE_LA_INTEGRACION =
  'Pídele a quien administra la empresa que revise la integración con apibara.'

// Cómo se dice un refresco que no se escribió: la clave o la cuota (a Integraciones quien puede; al resto, a quién pedírselo), un fallo del momento
// («Reintentar») o el error tal cual (con `conflicto`, «Recargar»).
function avisarDelFallo(
  resultado: Extract<ResultadoDelRefresco, { ok: false }>,
  salidas: { alIrAIntegraciones: (() => void) | null; alReintentar: () => void },
): void {
  if (resultado.revisarIntegracion && salidas.alIrAIntegraciones) {
    avisar(resultado.mensaje, {
      etiqueta: 'Ir a Integraciones',
      sale: true,
      alHacer: salidas.alIrAIntegraciones,
    })
    return
  }
  const error = resultado.error ?? { codigo: 'inesperado' as const, mensaje: resultado.mensaje }
  if (resultado.revisarIntegracion) {
    avisarError(error, { acciones: { acciones: [], pedido: PEDIDO_DE_LA_INTEGRACION } })
  } else if (resultado.reintentable && !resultado.conflicto) {
    avisarError(error, { alReintentar: salidas.alReintentar })
  } else {
    avisarError(error)
  }
}

export type VehiculoParaActualizar = {
  id: string
  origenId: string
  actualizadoEn: string
  urlOrigen: string | null
  lote: string | null
  vin: string | null
}

// «Actualizar los datos» del «⋯»: el mismo refresco que «Refrescar» de la ficha (`useRefrescoDeSubasta`, que no pisa lo editado) y, si la respuesta
// trae fotos que el vehículo no tiene, lo que hace «Traer las fotos que faltan» con esa misma respuesta (sin otra consulta). Dice el resultado con un
// aviso; con la clave o la cuota en falta, «Ir a Integraciones» a quien configura y a quién pedírselo al resto; un fallo del momento, «Reintentar».
export function useActualizarLosDatos(vehiculo: VehiculoParaActualizar, puedeConfigurar: boolean) {
  const router = useRouter()
  const entrada = entradaDeRefresco(vehiculo)
  const refresco = useRefrescoDeSubasta({
    vehiculoId: vehiculo.id,
    origenId: vehiculo.origenId,
    entrada: entrada ?? '',
    actualizadoEn: vehiculo.actualizadoEn,
    puedeConfigurar,
  })
  const fotos = useFotosDeSubasta(vehiculo.origenId)

  // Corre la consulta; vuelve cuando terminó (con el aviso dado), salvo si ya había una en curso.
  async function actualizar(): Promise<void> {
    if (entrada === null) {
      avisarError({ codigo: 'validacion', mensaje: SIN_ENTRADA_PARA_CONSULTAR })
      return
    }
    const resultado = await refresco.consultar()
    if (resultado === null) {
      return
    }
    if (resultado.ok) {
      avisarExito(resumenDelRefresco(resultado.actualizados, resultado.conservados))
      const fotas = resultado.fotasPorTraer ?? []
      // Sigue aunque el diálogo se cierre: el aviso de progreso es de la pantalla.
      if (fotas.length > 0) {
        void fotos.traer({ vehiculoId: vehiculo.id, fotas, sinFotos: resultado.sinFotos ?? false })
      }
      return
    }
    avisarDelFallo(resultado, {
      alIrAIntegraciones: puedeConfigurar
        ? () => {
            router.push(RUTA_DE_INTEGRACIONES as Route)
          }
        : null,
      alReintentar: () => void actualizar(),
    })
  }

  return { actualizar, enCurso: refresco.enCurso }
}
