// Qué acciones ofrece cada fila y cada grupo de «Relacionados»: se calculan de las banderas que da la base (`editable`, `puedoActuar`, `enCartera`) y de `ParaRelacionados`, que
// arma `src/app` con `puede()`. Ningún permiso cruza al navegador ni se pregunta por un rol. Cero I/O.
import { RUTAS } from '@/shared/lib/rutas'
import type {
  FilaRelacionada,
  LadoDeRelacionados,
  LeadRelacionado,
  TipoDeRelacion,
  VehiculoRelacionado,
} from './relacionados'

// Lo que `vehiculos` no conoce de `cotizaciones` y `leads`: lo arma la página (`src/app/(app)/_relacionados/para-relacionados.ts`).
export type ParaRelacionados = {
  // Los orígenes donde se puede cotizar, con la ruta de la hoja de ese origen (sin vehículo ni lead: `rutaDeLaHoja()`).
  cotizarEn: readonly { origenId: string; ruta: string }[]
  // Las claves de la URL de la hoja donde lleva su vehículo y su lead.
  claveDelVehiculo: string
  claveDelLead: string
  // La ruta de una cotización guardada con `:id` donde va el id (`rutaDeLaCotizacion(':id')`); null = quien mira no ve cotizaciones.
  rutaDeCotizacion: string | null
  // `leads.editar`: vincular y marcar interés (la cartera del lead la exige la base: `puedoActuar`).
  editarLeads: boolean
}

// Dónde se dibuja el bloque: la ficha (arriba), el resumen del listado (un drawer) o la unidad de logística. Lo que abre un panel y no cabe en un resumen lleva a la ficha.
export type LugarDeRelacionados = 'ficha' | 'resumen' | 'logistica'

export type AnclaDeVehiculo = {
  lado: 'vehiculo'
  vehiculoId: string
  origenId: string
  // Si quien mira puede editar el vehículo.
  editable: boolean
}
export type AnclaDeLead = {
  lado: 'lead'
  leadId: string
  // Cartera y `leads.editar`.
  puedoActuar: boolean
}

export type ContextoDeAcciones = {
  lugar: LugarDeRelacionados
  ancla: AnclaDeVehiculo | AnclaDeLead
  para: ParaRelacionados
}

export type AccionDeRelacionados =
  // Un enlace (cotizar, ver una cotización, llevar a la ficha con su panel).
  | { tipo: 'enlace'; clave: string; etiqueta: string; href: string }
  // «Quitar interés» en el lugar, con «Deshacer».
  | { tipo: 'quitar-interes'; etiqueta: string }
  // «Desvincular»: `confirmar` abre su confirmación (`?panel=desvincular`, vehículo); `directo`, en el lugar con «Deshacer» (lead con su cartera).
  | { tipo: 'desvincular'; etiqueta: string; modo: 'confirmar' | 'directo' }
  // Abre el selector de leads (`?panel=vincular-lead` o `?panel=marcar-interesado`) en la ficha del vehículo.
  | { tipo: 'elegir-lead'; clave: 'vincular-lead' | 'marcar-interesado'; etiqueta: string }

export const ETIQUETAS = {
  cotizar: 'Cotizar',
  verCotizacion: 'Ver cotización',
  quitarInteres: 'Quitar interés',
  desvincular: 'Desvincular',
  vincularALead: 'Vincular a un lead',
  marcarInteresado: 'Marcar un interesado',
  vincularOMarcar: 'Vincular o marcar un vehículo',
} as const

// La ruta de la hoja con el vehículo y, si hay, el lead (sin tocar lo demás de su consulta). Null si en ese origen no se cotiza.
export function rutaParaCotizarRelacionado(
  para: ParaRelacionados,
  datos: { origenId: string; vehiculoId: string; leadId: string | null },
): string | null {
  const origen = para.cotizarEn.find((uno) => uno.origenId === datos.origenId)
  if (!origen) {
    return null
  }
  const [camino = '', consulta = ''] = origen.ruta.split('?')
  const parametros = new URLSearchParams(consulta)
  parametros.set(para.claveDelVehiculo, datos.vehiculoId)
  if (datos.leadId !== null) {
    parametros.set(para.claveDelLead, datos.leadId)
  }
  return `${camino}?${parametros.toString()}`
}

const enlace = (clave: string, etiqueta: string, href: string): AccionDeRelacionados => ({
  tipo: 'enlace',
  clave,
  etiqueta,
  href,
})

export const rutaDeLaFichaDelVehiculo = (id: string, panel?: string): string =>
  `${RUTAS.vehiculos}/${id}${panel ? `?panel=${panel}` : ''}`

// La sección «Vehículos» de la ficha del lead (donde se gestiona), con un panel si hace falta.
export const rutaDeVehiculosDelLead = (id: string, consulta = ''): string =>
  `${RUTAS.leads}/${id}?seccion=vehiculos${consulta}`

// «Ver todos» de un grupo desde un resumen: la ficha del vehículo o del lead con su drawer abierto (`?relacionados=<tipo>`).
export function rutaDeVerTodos(ancla: ContextoDeAcciones['ancla'], tipo: TipoDeRelacion): string {
  return ancla.lado === 'vehiculo'
    ? `${RUTAS.vehiculos}/${ancla.vehiculoId}?relacionados=${tipo}`
    : `${RUTAS.leads}/${ancla.leadId}?relacionados=${tipo}`
}

function cotizarEnlace(
  para: ParaRelacionados,
  datos: { origenId: string; vehiculoId: string; leadId: string | null },
): AccionDeRelacionados[] {
  const href = rutaParaCotizarRelacionado(para, datos)
  return href === null ? [] : [enlace('cotizar', ETIQUETAS.cotizar, href)]
}

function verCotizacion(para: ParaRelacionados, cotizacionId: string): AccionDeRelacionados[] {
  return para.rutaDeCotizacion === null
    ? []
    : [
        enlace(
          'ver-cotizacion',
          ETIQUETAS.verCotizacion,
          para.rutaDeCotizacion.replace(':id', cotizacionId),
        ),
      ]
}

type Fila<Contraparte> = FilaRelacionada<Contraparte>

// «Cotizar» (y, en un cotizado, «Ver cotización» antes) de una fila: lo mismo desde los dos lados, con el origen de la fila.
function deCotizar(
  detalle: Fila<unknown>['detalle'],
  para: ParaRelacionados,
  datos: { origenId: string; vehiculoId: string; leadId: string },
): AccionDeRelacionados[] {
  return [
    ...(detalle.tipo === 'cotizado' ? verCotizacion(para, detalle.cotizacion.id) : []),
    ...cotizarEnlace(para, datos),
  ]
}

const QUITAR_INTERES: AccionDeRelacionados = {
  tipo: 'quitar-interes',
  etiqueta: ETIQUETAS.quitarInteres,
}

// «Desvincular» desde un vehículo: en la ficha, su confirmación (`?panel=desvincular`); en un resumen o en la unidad, lleva a la ficha, que es donde vive.
function desvincularDelVehiculo(
  lugar: LugarDeRelacionados,
  ancla: AnclaDeVehiculo,
): AccionDeRelacionados {
  return lugar === 'ficha'
    ? { tipo: 'desvincular', etiqueta: ETIQUETAS.desvincular, modo: 'confirmar' }
    : enlace(
        'desvincular',
        ETIQUETAS.desvincular,
        rutaDeLaFichaDelVehiculo(ancla.vehiculoId, 'desvincular'),
      )
}

// Las acciones de la fila de un lead, visto desde un vehículo.
function accionesDeFilaDeLead(
  fila: Fila<LeadRelacionado>,
  { lugar, para }: ContextoDeAcciones,
  ancla: AnclaDeVehiculo,
): AccionDeRelacionados[] {
  const { detalle, contraparte } = fila
  const acciones = deCotizar(detalle, para, {
    origenId: ancla.origenId,
    vehiculoId: ancla.vehiculoId,
    leadId: contraparte.leadId,
  })
  if (detalle.tipo === 'interesado' && contraparte.puedoActuar) {
    acciones.push(QUITAR_INTERES)
  }
  if (detalle.tipo === 'vinculado' && ancla.editable) {
    acciones.push(desvincularDelVehiculo(lugar, ancla))
  }
  return acciones
}

// Las acciones de la fila de un vehículo, visto desde un lead. Desvincular con la cartera se hace en el lugar (puede volver a vincular: «Deshacer»); sin ella, confirma en la ficha del lead.
function accionesDeFilaDeVehiculo(
  fila: Fila<VehiculoRelacionado>,
  { para }: ContextoDeAcciones,
  ancla: AnclaDeLead,
): AccionDeRelacionados[] {
  const { detalle, contraparte } = fila
  const acciones = deCotizar(detalle, para, {
    origenId: contraparte.origenId,
    vehiculoId: contraparte.vehiculoId,
    leadId: ancla.leadId,
  })
  if (detalle.tipo === 'interesado' && ancla.puedoActuar) {
    acciones.push(QUITAR_INTERES)
  }
  if (detalle.tipo === 'vinculado' && contraparte.editable) {
    acciones.push(
      ancla.puedoActuar
        ? { tipo: 'desvincular', etiqueta: ETIQUETAS.desvincular, modo: 'directo' }
        : enlace(
            'desvincular',
            ETIQUETAS.desvincular,
            rutaDeVehiculosDelLead(
              ancla.leadId,
              `&panel=desvincular&vinculado=${contraparte.vehiculoId}`,
            ),
          ),
    )
  }
  return acciones
}

// Las acciones de una fila (el «⋯» de esa fila).
export function accionesDeLaFila(
  fila: FilaRelacionada<LeadRelacionado | VehiculoRelacionado>,
  contexto: ContextoDeAcciones,
): AccionDeRelacionados[] {
  const { ancla } = contexto
  const { contraparte } = fila
  if (ancla.lado === 'vehiculo' && 'leadId' in contraparte) {
    return accionesDeFilaDeLead({ ...fila, contraparte }, contexto, ancla)
  }
  if (ancla.lado === 'lead' && 'vehiculoId' in contraparte) {
    return accionesDeFilaDeVehiculo({ ...fila, contraparte }, contexto, ancla)
  }
  return []
}

export type ResumenDeUnGrupo = {
  tipo: TipoDeRelacion
  // Cuántas filas se dibujan y cuántos ocultos hay.
  filas: number
  ocultos: number
}

// Lo que se ofrece en un grupo de un lead: vincular o marcar un vehículo se hace en la sección «Vehículos» de la ficha (su panel con su búsqueda y su nota): un solo enlace, en el primer grupo.
function accionesDelGrupoDeLead(
  grupo: ResumenDeUnGrupo,
  ancla: AnclaDeLead,
): AccionDeRelacionados[] {
  return grupo.tipo === 'vinculado' && ancla.puedoActuar
    ? [
        enlace(
          'vincular-o-marcar',
          ETIQUETAS.vincularOMarcar,
          rutaDeVehiculosDelLead(ancla.leadId, '&panel=agregar-vehiculo'),
        ),
      ]
    : []
}

// Lo que se ofrece en un grupo de un vehículo: vincular (sin vínculo, ni uno oculto que frena), desvincular un vínculo que quien mira no ve (sin fila no hay «⋯»: es la salida de siempre para quien
// edita el vehículo), marcar un interesado y cotizar sin lead.
function accionesDelGrupoDeVehiculo(
  grupo: ResumenDeUnGrupo,
  { lugar, para }: ContextoDeAcciones,
  ancla: AnclaDeVehiculo,
): AccionDeRelacionados[] {
  const vacio = grupo.filas === 0 && grupo.ocultos === 0
  if (grupo.tipo === 'vinculado') {
    if (grupo.filas === 0 && grupo.ocultos > 0) {
      return ancla.editable ? [desvincularDelVehiculo(lugar, ancla)] : []
    }
    return vacio && ancla.editable && para.editarLeads
      ? [hacia(lugar, ancla, 'vincular-lead', ETIQUETAS.vincularALead)]
      : []
  }
  if (grupo.tipo === 'interesado') {
    return para.editarLeads
      ? [hacia(lugar, ancla, 'marcar-interesado', ETIQUETAS.marcarInteresado)]
      : []
  }
  return vacio
    ? cotizarEnlace(para, { origenId: ancla.origenId, vehiculoId: ancla.vehiculoId, leadId: null })
    : []
}

// Lo que se ofrece en el grupo mismo (no en una fila): vincular, marcar, cotizar sin lead, o llevar a la ficha del lead.
export function accionesDelGrupo(
  grupo: ResumenDeUnGrupo,
  contexto: ContextoDeAcciones,
): AccionDeRelacionados[] {
  const { ancla } = contexto
  return ancla.lado === 'lead'
    ? accionesDelGrupoDeLead(grupo, ancla)
    : accionesDelGrupoDeVehiculo(grupo, contexto, ancla)
}

// En la ficha del vehículo el selector se abre en el lugar; en los demás, lleva a la ficha con el panel abierto.
function hacia(
  lugar: LugarDeRelacionados,
  ancla: AnclaDeVehiculo,
  clave: 'vincular-lead' | 'marcar-interesado',
  etiqueta: string,
): AccionDeRelacionados {
  return lugar === 'ficha'
    ? { tipo: 'elegir-lead', clave, etiqueta }
    : enlace(clave, etiqueta, rutaDeLaFichaDelVehiculo(ancla.vehiculoId, clave))
}

// Las acciones de la línea de «todo vacío»: las de vincular y marcar, sin cotizar.
export function accionesDeTodoVacio(contexto: ContextoDeAcciones): AccionDeRelacionados[] {
  return (['vinculado', 'interesado'] as const).flatMap((tipo) =>
    accionesDelGrupo({ tipo, filas: 0, ocultos: 0 }, contexto),
  )
}

export function ladoDe(ancla: ContextoDeAcciones['ancla']): LadoDeRelacionados {
  return ancla.lado
}
