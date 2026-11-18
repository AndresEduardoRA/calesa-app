'use client'

import type { AccionDeRelacionados } from '../../../entities/acciones-de-relacionados'
import type {
  FilaRelacionada,
  LeadRelacionado,
  VehiculoRelacionado,
} from '../../../entities/relacionados'
import { useVinculo } from '../../vinculo/hooks/use-vinculo'

// Sobre qué vehículo o lead se mira: el vehículo lleva lo que pide el aviso («Desvinculado el Toyota…»).
export type AnclaDeAcciones =
  | {
      lado: 'vehiculo'
      vehiculo: { id: string; titulo: string; numero: number; actualizadoEn: string }
    }
  | { lado: 'lead'; leadId: string }

type Fila = FilaRelacionada<LeadRelacionado | VehiculoRelacionado> | null

// Lo que hace cada acción del «⋯» que se resuelve en el lugar: quitar interés y desvincular (con «Deshacer»), y, desde un vehículo, vincular y marcar a un lead elegido. Todo por
// las mismas RPC de siempre (`useVinculo`); `alCambiar` corre tras lo logrado. Lo que abre un panel (la confirmación de
// desvincular, los selectores de leads) lo resuelve `usePanelesDeLaFicha` y llega por `alAbrir`.
export function useAccionesDeRelacionados(
  ancla: AnclaDeAcciones,
  {
    alCambiar,
    alAbrir,
  }: { alCambiar?: () => void; alAbrir?: (accion: AccionDeRelacionados) => void } = {},
) {
  const vinculo = useVinculo(
    ancla.lado === 'lead' ? ancla.leadId : null,
    alCambiar ? { alCambiar } : {},
  )

  function ejecutar(accion: AccionDeRelacionados, fila: Fila) {
    if (
      accion.tipo === 'elegir-lead' ||
      (accion.tipo === 'desvincular' && accion.modo === 'confirmar')
    ) {
      alAbrir?.(accion)
      return
    }
    if (!fila || accion.tipo === 'enlace') {
      return
    }
    const { contraparte } = fila
    if (ancla.lado === 'vehiculo' && 'leadId' in contraparte) {
      void vinculo.quitar(ancla.vehiculo, contraparte.leadId)
    } else if (ancla.lado === 'lead' && 'vehiculoId' in contraparte) {
      const vehiculo = {
        id: contraparte.vehiculoId,
        titulo: contraparte.titulo,
        numero: contraparte.numero,
        actualizadoEn: contraparte.actualizadoEn,
      }
      if (accion.tipo === 'quitar-interes') {
        void vinculo.quitar(vehiculo)
      } else {
        void vinculo.desvincular(vehiculo, { deshacer: true })
      }
    }
  }

  // Un lead elegido en un selector (sólo desde un vehículo): vincula o marca interés, sin nota (la nota se pone desde la ficha del lead).
  const vincularA = (leadId: string) =>
    ancla.lado === 'vehiculo' ? vinculo.vincular(ancla.vehiculo, undefined, leadId) : null
  const marcarA = (leadId: string) =>
    ancla.lado === 'vehiculo' ? vinculo.marcar(ancla.vehiculo, null, leadId) : null

  return { enCurso: vinculo.enCurso, ejecutar, vincularA, marcarA }
}

export type AccionesDeRelacionados = ReturnType<typeof useAccionesDeRelacionados>
