// Sólo para las pruebas de las acciones de «Qué falta»: capacidades, requisitos y destinos de ejemplo.
import type { RequisitoQueFalta } from './accion-de-requisito'
import type { CapacidadesDeQueFalta } from './capacidades-de-que-falta'

export const VEHICULO = '00000000-0000-4000-8000-0000000000a1'
export const TIPO_BL = '00000000-0000-4000-8000-0000000000b1'

export function capacidades(cambios: Partial<CapacidadesDeQueFalta> = {}): CapacidadesDeQueFalta {
  return {
    tipo: 'vehiculo',
    subirDocumentos: false,
    aprobarDocumentos: false,
    editarTransporte: false,
    gestionarAduana: false,
    verPagos: false,
    editarPagos: false,
    confirmarPagos: false,
    editarVehiculo: false,
    editarLeads: false,
    gestionarFinal: false,
    verCotizaciones: false,
    verRepuestos: false,
    moverRepuestos: false,
    editarRepuestos: false,
    editarCostosDeRepuestos: false,
    verLogistica: true,
    asignarTareas: false,
    veHueco: { documentos: true, transporte: true, aduana: true, pagos: false, repuestos: false },
    ...cambios,
  }
}

export function documento(detalle: Record<string, unknown> = {}): RequisitoQueFalta {
  return {
    requisitoId: 'r-doc',
    tipo: 'documento',
    cumplido: false,
    bloqueante: true,
    detalle: {
      aprobados: 0,
      por_revisar: 0,
      min: 1,
      max: null,
      tipo_documento_id: TIPO_BL,
      ...detalle,
    },
    etiqueta: 'BL',
    falta: 'BL aprobado',
  }
}

export function dato(clave: string, etiqueta = clave): RequisitoQueFalta {
  return {
    requisitoId: `r-${clave}`,
    tipo: 'dato',
    cumplido: false,
    bloqueante: true,
    detalle: { clave_dato: clave },
    etiqueta,
    falta: etiqueta,
  }
}

export function espera(detalle: Record<string, unknown>): RequisitoQueFalta {
  return {
    requisitoId: 'r-espera',
    tipo: 'espera',
    cumplido: false,
    bloqueante: true,
    detalle,
    etiqueta: 'Esperar a «Recibido»',
    falta: 'Esperar a «Recibido»',
  }
}
