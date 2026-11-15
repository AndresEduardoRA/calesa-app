// «Relacionados»: lo que un vehículo y un lead tienen en común, en tres grupos (docs/GLOSARIO.md › Relacionados): Vinculado (el lead dueño o comprador del
// vehículo), Interesado (`vehiculos_interesados`) y Cotizado (una cotización activa). Desde el vehículo se ven leads; desde el lead, vehículos. Lo que quien mira no
// ve llega contado (`ocultos`), nunca con datos. Cero I/O: la lectura la hacen `vehiculo_relacionados()` y `lead_relacionados()` (`relacionados-lectura.ts`).
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import type { ConteoAcotado } from '@/shared/lib/conteo'
import type { NumerosDeLead } from '@/shared/lib/numeros-de-lead'

export const TIPOS_DE_RELACION = ['vinculado', 'interesado', 'cotizado'] as const
export type TipoDeRelacion = (typeof TIPOS_DE_RELACION)[number]

// Cuántas filas dibuja cada grupo en el bloque (el resto, en «Ver todos»), el tope de lo que cuenta su cabecera (la base lee una ventana de `tope + 1`) y de a cuántas pide
// «Ver todos» (por cursor, hasta `TOPE_DE_LO_CARGADO`).
export const PRIMEROS_DE_RELACIONADOS = 3
export const TOPE_DEL_CONTEO_DE_RELACIONADOS = 100
export const TAMANO_DE_RELACIONADOS = TAMANO_DE_VER_MAS

// Hacia qué lado se mira: desde un vehículo se ven leads; desde un lead, vehículos.
export type LadoDeRelacionados = 'vehiculo' | 'lead'

export const NOMBRE_DEL_TIPO: Record<TipoDeRelacion, string> = {
  vinculado: 'Vinculado',
  interesado: 'Interesado',
  cotizado: 'Cotizado',
}

// Una línea bajo cada grupo, por lado.
export const LEYENDAS: Record<LadoDeRelacionados, Record<TipoDeRelacion, string>> = {
  vehiculo: {
    vinculado: 'El lead dueño o comprador de este vehículo.',
    interesado: 'Leads que mostraron interés en este vehículo.',
    cotizado: 'Leads con una cotización activa de este vehículo.',
  },
  lead: {
    vinculado: 'Vehículos de los que este lead es dueño o comprador.',
    interesado: 'Vehículos que le interesan a este lead.',
    cotizado: 'Vehículos con una cotización activa para este lead.',
  },
}

export const VACIOS: Record<LadoDeRelacionados, Record<TipoDeRelacion, string>> = {
  vehiculo: {
    vinculado: 'Sin vínculo.',
    interesado: 'Nadie marcó interés todavía.',
    cotizado: 'Sin cotizaciones activas.',
  },
  lead: {
    vinculado: 'Ningún vehículo vinculado.',
    interesado: 'Sin vehículos de interés.',
    cotizado: 'Sin cotizaciones activas.',
  },
}

export const TEXTO_DE_TODO_VACIO = 'Sin relacionados todavía.'
export const TEXTO_DE_ERROR = 'No pudimos cargar los relacionados.'
export const TEXTO_DE_CORTADA = 'No pudimos revisar el resto: hay muchos que no puedes ver.'
export const TEXTO_DE_FUERA_DE_CARTERA = 'Fuera de tu cartera'

// «1 que no puedes ver», «3 que no puedes ver».
export function textoDeOcultos(n: number): string {
  return `${n} que no puedes ver`
}

export type LeadRelacionado = {
  leadId: string
  nombre: string
  numeros: NumerosDeLead
  // El lead está en la cartera de quien mira: si no, se ve enmascarado («Fuera de tu cartera») y no se le quita el interés.
  enCartera: boolean
  // Cartera y `leads.editar`: vincular, marcar y quitar interés de este lead.
  puedoActuar: boolean
}

export type VehiculoRelacionado = {
  vehiculoId: string
  numero: number
  titulo: string
  // La versión del vehículo: la piden vincular y desvincular.
  actualizadoEn: string
  origenId: string
  origenNombre: string | null
  // La miniatura de la portada (ruta en el bucket `vehiculos`); null = sin fotos.
  portada: string | null
  // Si quien mira puede editar el vehículo.
  editable: boolean
}

export type CotizacionRelacionada = {
  id: string
  numero: number
  clase: string
  creadoEn: string
}

// Lo propio de cada tipo de relación.
export type DetalleDeRelacion =
  | { tipo: 'vinculado'; desde: string | null }
  | { tipo: 'interesado'; nota: string | null; creadoEn: string; porNombre: string | null }
  | { tipo: 'cotizado'; cotizacion: CotizacionRelacionada }

export type FilaRelacionada<Contraparte> = {
  contraparte: Contraparte
  detalle: DetalleDeRelacion
}

export type GrupoDeRelacionados<Contraparte> = {
  tipo: TipoDeRelacion
  // Las primeras visibles (a lo sumo `PRIMEROS_DE_RELACIONADOS`).
  filas: FilaRelacionada<Contraparte>[]
  // Lo leído de una ventana de `TOPE_DEL_CONTEO_DE_RELACIONADOS + 1`: con tope, nunca un total exacto. Incluye lo oculto.
  conteo: ConteoAcotado
  // Lo que quien mira no ve, dentro de esa ventana: sólo el número.
  ocultos: number
  // Hay más que estas filas para ver en «Ver todos» (las visibles que no caben, o más que la ventana).
  hayMas: boolean
}

export type GruposDeRelacionados<Contraparte> = {
  vinculado: GrupoDeRelacionados<Contraparte>
  interesado: GrupoDeRelacionados<Contraparte>
  // null = quien mira no tiene `cotizaciones.ver` donde corresponde: el grupo no existe.
  cotizado: GrupoDeRelacionados<Contraparte> | null
}

export type RelacionadosDelVehiculo = {
  vehiculoId: string
  // El título y el número del vehículo (los avisos lo nombran), si quien mira puede editarlo y su versión (desvincular).
  titulo: string
  numero: number
  editable: boolean
  actualizadoEn: string
  origenId: string
  grupos: GruposDeRelacionados<LeadRelacionado>
  // El vínculo vigente tiene anteriores en el historial.
  conAnteriores: boolean
}

export type RelacionadosDelLead = {
  leadId: string
  // Cartera y `leads.editar`.
  puedoActuar: boolean
  grupos: GruposDeRelacionados<VehiculoRelacionado>
}

// Una página de «Ver todos»: tamaño + 1 filas como mucho (la de más sólo dice que hay otra página). `cortada`: la base dejó de revisar tras demasiadas filas ocultas.
export type PaginaDeRelacionados<Contraparte> = {
  filas: FilaRelacionada<Contraparte>[]
  cortada: boolean
  // Con `cortada`, hasta dónde se recorrió: «Seguir buscando» sigue desde ahí (el cursor de la última fila visible volvería a recorrer el mismo hueco de ocultas).
  siguiente: CursorDeRelacionados | null
}

// El cursor `(fecha, id)` de una fila: la fecha y el id con que la base la ordena (`vehiculo_relacionados_pagina()`).
export type CursorDeRelacionados = { en: string; id: string }

export function cursorDeLaFila(
  fila: FilaRelacionada<LeadRelacionado | VehiculoRelacionado>,
): CursorDeRelacionados {
  const { detalle, contraparte } = fila
  const id = 'leadId' in contraparte ? contraparte.leadId : contraparte.vehiculoId
  if (detalle.tipo === 'cotizado') {
    return { en: detalle.cotizacion.creadoEn, id: detalle.cotizacion.id }
  }
  return { en: detalle.tipo === 'vinculado' ? (detalle.desde ?? '') : detalle.creadoEn, id }
}

// Si todo está vacío (nada en ningún grupo, ni oculto): una sola línea con las acciones.
export function todoVacio(grupos: GruposDeRelacionados<unknown>): boolean {
  return [grupos.vinculado, grupos.interesado, grupos.cotizado].every(
    (grupo) => grupo === null || (grupo.filas.length === 0 && grupo.ocultos === 0),
  )
}
