// «Nueva oportunidad…» desde el «⋯» de un lead: un formulario corto con todo precargado. El embudo (el de por defecto de quien mira), la etapa
// (la inicial) y el estado los pone la base al crear; acá sólo se escribe el título (con el nombre del lead de sugerencia) y, si se quiere,
// el monto. Lo demás (notas, vehículo) se completa después con «Editar» en la ficha.
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { RUTAS } from '@/shared/lib/rutas'
import { CLAVE_DE_SECCION } from './ficha'
import {
  CLAVE_DE_OPORTUNIDAD,
  PANEL_EDITAR_OPORTUNIDAD,
  datosDeOportunidad,
  LARGO_MAXIMO_DE_TITULO,
  validarOportunidad,
  type DatosDeOportunidad,
  type ErroresDeOportunidad,
  type OportunidadDelLead,
} from './oportunidad'
import type { AbiertaEnEmbudo } from './oportunidad-unica'

// `?panel=oportunidad-rapida&para=<id>`: lo atiende el listado y el kanban (con `para`). La ficha y el resumen lo abren sin `para` (el lead ya es el
// suyo: `?panel=oportunidad-rapida` en la ficha, `?lead=<id>&panel=oportunidad-rapida` en el resumen).
export const PANEL_OPORTUNIDAD_RAPIDA = 'oportunidad-rapida'

export type ValoresDeOportunidadRapida = { titulo: string; monto: string }

// El título que se ofrece: el nombre del lead, el mismo que usa la oportunidad base (`_lead_oportunidad_base`).
export function tituloSugeridoDeOportunidad(nombreDelLead: string): string {
  return nombreDelLead.trim().slice(0, LARGO_MAXIMO_DE_TITULO)
}

export function valoresDeOportunidadRapida(nombreDelLead: string): ValoresDeOportunidadRapida {
  return { titulo: tituloSugeridoDeOportunidad(nombreDelLead), monto: '' }
}

// Escribió algo que cerrar perdería: otro título o un monto.
export function hayCambiosEnOportunidadRapida(
  valores: ValoresDeOportunidadRapida,
  inicial: ValoresDeOportunidadRapida,
): boolean {
  return valores.titulo !== inicial.titulo || valores.monto.trim() !== inicial.monto
}

export type PedidoDeOportunidadRapida =
  { tipo: 'invalido'; errores: ErroresDeOportunidad } | { tipo: 'crear'; datos: DatosDeOportunidad }

// Lo que viaja al crear, o por qué no sale (el mismo mensaje por campo que la base y que el panel completo).
export function pedidoDeOportunidadRapida(
  valores: ValoresDeOportunidadRapida,
  locale: string,
): PedidoDeOportunidadRapida {
  const completos = { ...valores, notas: '', vehiculo: '' }
  const errores = validarOportunidad(completos, locale)
  if (Object.keys(errores).length > 0) {
    return { tipo: 'invalido', errores }
  }
  return { tipo: 'crear', datos: datosDeOportunidad(completos, locale) }
}

// El aviso de antes de crear: lo que el lead ya tiene, según quien mira (la base entrega sólo las suyas). Se leen a lo sumo `LEIDAS_PARA_EL_AVISO`
// (una más de las que se muestran: así se sabe si hay más sin contar) y se muestran `MOSTRADAS_EN_EL_AVISO`.
export const MOSTRADAS_EN_EL_AVISO = 5
export const LEIDAS_PARA_EL_AVISO = MOSTRADAS_EN_EL_AVISO + 1

export type AvisoDeOportunidades = {
  mostradas: OportunidadDelLead[]
  // Lo que no se muestra: «y 1 más» (exacto) o «y más» (la lectura no sabe cuántas son). Nunca un total.
  resto: string | null
}

export function avisoDeOportunidades(
  leidas: readonly OportunidadDelLead[],
  hayMas: boolean,
): AvisoDeOportunidades {
  const mostradas = leidas.slice(0, MOSTRADAS_EN_EL_AVISO)
  const sobran = leidas.length - mostradas.length
  if (sobran <= 0 && !hayMas) {
    return { mostradas, resto: null }
  }
  return { mostradas, resto: hayMas ? 'y más' : `y ${String(sobran)} más` }
}

// El motivo de un embudo donde el lead ya tiene una abierta (una por lead y embudo): «Crear igual» apagado, el embudo apagado al crear.
export function motivoDeAbierta(nombreDelEmbudo: string): string {
  return `Ya tiene una abierta en «${nombreDelEmbudo}».`
}

export type CrearIgual =
  { puede: true } | { puede: false; motivo: string; abierta: AbiertaEnEmbudo }

// «Crear igual» del aviso crea en el embudo por defecto: si el lead ya tiene una abierta ahí, va apagado con su motivo y «Abrir esa» al lado.
// Sin la lectura de dónde hay abiertas (falló), se puede: la base decide.
export function crearIgual(abiertas: readonly AbiertaEnEmbudo[] | null): CrearIgual {
  const enElPorDefecto = abiertas?.find((a) => a.esDefault)
  return enElPorDefecto
    ? {
        puede: false,
        motivo: motivoDeAbierta(enElPorDefecto.embudoNombre),
        abierta: enElPorDefecto,
      }
    : { puede: true }
}

// La ficha del lead en su sección «Oportunidades» (`?seccion=oportunidades`), y con una abierta en su panel.
export function rutaDeLasOportunidadesDe(leadId: string, oportunidadId?: string): string {
  const base = `${RUTAS.leads}/${leadId}?${CLAVE_DE_SECCION}=oportunidades`
  return oportunidadId === undefined
    ? base
    : `${base}&${CLAVE_DE_PANEL}=${PANEL_EDITAR_OPORTUNIDAD}&${CLAVE_DE_OPORTUNIDAD}=${oportunidadId}`
}
