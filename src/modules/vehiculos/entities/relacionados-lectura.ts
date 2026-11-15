// Lo que devuelven `vehiculo_relacionados()`, `lead_relacionados()` y sus páginas, pasado por Zod (acepta nulo donde la base lo da) y vuelto los tipos de
// `relacionados.ts`. Una forma rota da `null`: la pantalla dice «No pudimos cargar los relacionados» en vez de caerse.
import { z } from 'zod'
import { conteoAcotado } from '@/shared/lib/conteo'
import { CAMPOS_DE_NUMEROS, numerosDesde } from '@/shared/lib/numeros-de-lead'
import {
  TOPE_DEL_CONTEO_DE_RELACIONADOS,
  type CotizacionRelacionada,
  type DetalleDeRelacion,
  type FilaRelacionada,
  type GrupoDeRelacionados,
  type LeadRelacionado,
  type PaginaDeRelacionados,
  type RelacionadosDelLead,
  type RelacionadosDelVehiculo,
  type TipoDeRelacion,
  type VehiculoRelacionado,
} from './relacionados'

const cotizacion = z.object({
  id: z.guid(),
  numero: z.number(),
  clase: z.string(),
  creado_en: z.string(),
})

const lead = z.object({
  lead_id: z.guid(),
  nombre: z.string(),
  en_cartera: z.boolean(),
  puedo_actuar: z.boolean(),
  ...CAMPOS_DE_NUMEROS,
})

const vehiculo = z.object({
  id: z.guid(),
  numero: z.number(),
  titulo: z.string(),
  actualizado_en: z.string(),
  origen_id: z.guid(),
  origen_nombre: z.string().nullable(),
  portada: z.string().nullable(),
  editable: z.boolean(),
})

const propio = {
  desde: z.string().nullable().optional(),
  nota: z.string().nullable().optional(),
  creado_en: z.string().optional(),
  por_nombre: z.string().nullable().optional(),
  cotizacion: cotizacion.optional(),
}

const filaDeLead = lead.extend(propio)
const filaDeVehiculo = vehiculo.extend(propio)
type PropioCrudo = {
  desde?: string | null
  nota?: string | null
  creado_en?: string
  por_nombre?: string | null
  cotizacion?: { id: string; numero: number; clase: string; creado_en: string }
}

function detalleDe(tipo: TipoDeRelacion, crudo: PropioCrudo): DetalleDeRelacion | null {
  if (tipo === 'vinculado') {
    return { tipo, desde: crudo.desde ?? null }
  }
  if (tipo === 'interesado') {
    return crudo.creado_en === undefined
      ? null
      : {
          tipo,
          nota: crudo.nota ?? null,
          creadoEn: crudo.creado_en,
          porNombre: crudo.por_nombre ?? null,
        }
  }
  if (!crudo.cotizacion) {
    return null
  }
  const { id, numero, clase, creado_en: creadoEn } = crudo.cotizacion
  const dada: CotizacionRelacionada = { id, numero, clase, creadoEn }
  return { tipo, cotizacion: dada }
}

function leadDesde(crudo: z.infer<typeof lead>): LeadRelacionado {
  return {
    leadId: crudo.lead_id,
    nombre: crudo.nombre,
    numeros: numerosDesde(crudo),
    enCartera: crudo.en_cartera,
    puedoActuar: crudo.puedo_actuar,
  }
}

function vehiculoDesde(crudo: z.infer<typeof vehiculo>): VehiculoRelacionado {
  return {
    vehiculoId: crudo.id,
    numero: crudo.numero,
    titulo: crudo.titulo,
    actualizadoEn: crudo.actualizado_en,
    origenId: crudo.origen_id,
    origenNombre: crudo.origen_nombre,
    portada: crudo.portada,
    editable: crudo.editable,
  }
}

// Las filas de un grupo; una sin su detalle rompe la forma (la pantalla no inventa lo que falta).
function filasDe<Crudo extends PropioCrudo, Contraparte>(
  tipo: TipoDeRelacion,
  crudas: readonly Crudo[],
  contraparteDe: (fila: Crudo) => Contraparte,
): FilaRelacionada<Contraparte>[] | null {
  const filas: FilaRelacionada<Contraparte>[] = []
  for (const cruda of crudas) {
    const detalle = detalleDe(tipo, cruda)
    if (!detalle) {
      return null
    }
    filas.push({ contraparte: contraparteDe(cruda), detalle })
  }
  return filas
}

function grupoDe<Crudo extends PropioCrudo, Contraparte>(
  tipo: TipoDeRelacion,
  grupo: { filas: readonly Crudo[]; leidos: number; ocultos: number; ventana_llena?: boolean },
  contraparteDe: (fila: Crudo) => Contraparte,
): GrupoDeRelacionados<Contraparte> | null {
  const filas = filasDe(tipo, grupo.filas, contraparteDe)
  if (!filas) {
    return null
  }
  const conteo = conteoAcotado(grupo.leidos, TOPE_DEL_CONTEO_DE_RELACIONADOS)
  const visibles = grupo.leidos - grupo.ocultos
  return {
    tipo,
    filas,
    conteo: { n: conteo.n, hayMas: conteo.hayMas || grupo.ventana_llena === true },
    ocultos: grupo.ocultos,
    hayMas: visibles > filas.length || conteo.hayMas || grupo.ventana_llena === true,
  }
}

const grupoCrudo = <Fila extends z.ZodType>(fila: Fila) =>
  z.object({
    filas: z.array(fila),
    leidos: z.number().int().nonnegative(),
    ocultos: z.number().int().nonnegative(),
  })
const grupoDeCotizados = <Fila extends z.ZodType>(fila: Fila) =>
  grupoCrudo(fila).extend({ ventana_llena: z.boolean() })

const delVehiculo = z.object({
  titulo: z.string(),
  numero: z.number(),
  editable: z.boolean(),
  actualizado_en: z.string(),
  origen_id: z.guid(),
  vinculado: z.object({
    fila: filaDeLead.nullable(),
    oculto: z.boolean(),
    con_anteriores: z.boolean(),
  }),
  interesados: grupoCrudo(filaDeLead),
  cotizados: grupoDeCotizados(filaDeLead).nullable(),
})

const delLead = z.object({
  puedo_actuar: z.boolean(),
  vinculados: grupoCrudo(filaDeVehiculo),
  interesados: grupoCrudo(filaDeVehiculo),
  cotizados: grupoDeCotizados(filaDeVehiculo).nullable(),
})

type FilaDeLeadCruda = z.infer<typeof filaDeLead>
type FilaDeVehiculoCruda = z.infer<typeof filaDeVehiculo>

// `vehiculo_relacionados(p_vehiculo)`.
export function relacionadosDelVehiculoDesde(
  vehiculoId: string,
  crudo: unknown,
): RelacionadosDelVehiculo | null {
  const leido = delVehiculo.safeParse(crudo)
  if (!leido.success) {
    return null
  }
  const { vinculado, interesados, cotizados } = leido.data
  const deVinculo = vinculado.fila
    ? { filas: [vinculado.fila], leidos: 1, ocultos: 0 }
    : { filas: [], leidos: vinculado.oculto ? 1 : 0, ocultos: vinculado.oculto ? 1 : 0 }
  const vinculadoGrupo = grupoDe('vinculado', deVinculo, (fila: FilaDeLeadCruda) => leadDesde(fila))
  const interesadoGrupo = grupoDe('interesado', interesados, (fila: FilaDeLeadCruda) =>
    leadDesde(fila),
  )
  const cotizadoGrupo = cotizados
    ? grupoDe('cotizado', cotizados, (fila: FilaDeLeadCruda) => leadDesde(fila))
    : null
  if (!vinculadoGrupo || !interesadoGrupo || (cotizados && !cotizadoGrupo)) {
    return null
  }
  return {
    vehiculoId,
    titulo: leido.data.titulo,
    numero: leido.data.numero,
    editable: leido.data.editable,
    actualizadoEn: leido.data.actualizado_en,
    origenId: leido.data.origen_id,
    conAnteriores: vinculado.con_anteriores,
    grupos: { vinculado: vinculadoGrupo, interesado: interesadoGrupo, cotizado: cotizadoGrupo },
  }
}

// `lead_relacionados(p_lead)`.
export function relacionadosDelLeadDesde(
  leadId: string,
  crudo: unknown,
): RelacionadosDelLead | null {
  const leido = delLead.safeParse(crudo)
  if (!leido.success) {
    return null
  }
  const { vinculados, interesados, cotizados } = leido.data
  const vinculado = grupoDe('vinculado', vinculados, (fila: FilaDeVehiculoCruda) =>
    vehiculoDesde(fila),
  )
  const interesado = grupoDe('interesado', interesados, (fila: FilaDeVehiculoCruda) =>
    vehiculoDesde(fila),
  )
  const cotizado = cotizados
    ? grupoDe('cotizado', cotizados, (fila: FilaDeVehiculoCruda) => vehiculoDesde(fila))
    : null
  if (!vinculado || !interesado || (cotizados && !cotizado)) {
    return null
  }
  return {
    leadId,
    puedoActuar: leido.data.puedo_actuar,
    grupos: { vinculado, interesado, cotizado },
  }
}

const corte = z.object({ en: z.string(), id: z.guid() }).nullable().optional()
const paginaDeLeads = z.object({
  filas: z.array(filaDeLead),
  cortada: z.boolean(),
  siguiente: corte,
})
const paginaDeVehiculos = z.object({
  filas: z.array(filaDeVehiculo),
  cortada: z.boolean(),
  siguiente: corte,
})

// `vehiculo_relacionados_pagina()`: leads.
export function paginaDeLeadsDesde(
  tipo: TipoDeRelacion,
  crudo: unknown,
): PaginaDeRelacionados<LeadRelacionado> | null {
  const leida = paginaDeLeads.safeParse(crudo)
  const filas = leida.success
    ? filasDe(tipo, leida.data.filas, (fila: FilaDeLeadCruda) => leadDesde(fila))
    : null
  return leida.success && filas
    ? { filas, cortada: leida.data.cortada, siguiente: leida.data.siguiente ?? null }
    : null
}

// `lead_relacionados_pagina()`: vehículos.
export function paginaDeVehiculosDesde(
  tipo: TipoDeRelacion,
  crudo: unknown,
): PaginaDeRelacionados<VehiculoRelacionado> | null {
  const leida = paginaDeVehiculos.safeParse(crudo)
  const filas = leida.success
    ? filasDe(tipo, leida.data.filas, (fila: FilaDeVehiculoCruda) => vehiculoDesde(fila))
    : null
  return leida.success && filas
    ? { filas, cortada: leida.data.cortada, siguiente: leida.data.siguiente ?? null }
    : null
}
