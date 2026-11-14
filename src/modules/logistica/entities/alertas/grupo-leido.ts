import { z } from 'zod'
import type { ConteoAcotado } from '@/shared/lib/conteo'
import { fallo, MENSAJE_INESPERADO, ok, type Resultado } from '@/shared/lib/errores'
import { esquemaDeSituacionDeLaUnidad, type SituacionDeLaUnidad } from '../nucleo/situacion'
import type { GrupoDeLaBandeja } from './grupos'

// Lo que devuelve `logistica_bandeja_grupo()`, validado con Zod en el borde (ids con `z.guid()`, fechas como texto ISO; su `Returns` es `Json`). Una forma que no es la esperada es un error
// visible, nunca una fila a medias. Puro: ninguna lectura.

type Comun = { vehiculoId: string; origenId: string; titulo: string; nombre: string }

export type FilaDeLaBandeja =
  | (Comun & {
      grupo: 'demorados'
      faseId: string
      fase: string
      faseDesde: string | null
      situacion: SituacionDeLaUnidad
      dias: number
    })
  | (Comun & {
      grupo: 'trabados'
      fase: string
      faseDesde: string | null
      situacion: SituacionDeLaUnidad
      faseSiguiente: string
      motivo: string
    })
  | (Comun & { grupo: 'por_aprobar'; documentoId: string; tipo: string; creadoEn: string })
  | (Comun & {
      grupo: 'por_vencer'
      documentoId: string
      tipo: string
      venceEl: string
      modo: 'renovar' | 'solicitar'
    })
  | (Comun & { grupo: 'llegadas'; fase: string; etaEl: string; contenedor: string | null })
  | (Comun & {
      grupo: 'salidas'
      fase: string | null
      zarpeEl: string
      booking: string | null
      contenedor: string | null
    })
  | (Comun & { grupo: 'sin_resolver'; creadoEn: string })

// Por dónde sigue un grupo: el instante y el id de la última fila leída.
export type CursorDeLaBandeja = { desde: string; id: string }

export type LecturaDelGrupo = {
  filas: FilaDeLaBandeja[]
  hayMas: boolean
  siguiente: CursorDeLaBandeja | null
  // La base paró de recorrer (evaluó 200 demoradas o leyó 2.000 documentos sin llenar la página): `siguiente` dice por dónde seguir.
  cortada: boolean
  // Sólo en la primera página y si se pidió: hasta el tope, nunca un total.
  conteo: ConteoAcotado | null
}

const fecha = z.string().min(1)
const guid = z.guid()
const comunes = { origen_id: guid, titulo: z.string() }

const esquemas = {
  demorados: z.object({
    id: guid,
    ...comunes,
    fase_id: guid,
    fase: z.string(),
    fase_desde: z.string().nullable(),
    situacion: esquemaDeSituacionDeLaUnidad,
    dias: z.number(),
  }),
  trabados: z.object({
    id: guid,
    ...comunes,
    fase: z.string(),
    fase_desde: z.string().nullable(),
    situacion: esquemaDeSituacionDeLaUnidad,
    fase_siguiente: z.string(),
    motivo: z.string(),
  }),
  por_aprobar: z.object({
    documento_id: guid,
    vehiculo_id: guid,
    ...comunes,
    tipo: z.string(),
    creado_en: fecha,
  }),
  por_vencer: z.object({
    documento_id: guid,
    vehiculo_id: guid,
    ...comunes,
    tipo: z.string(),
    vence_el: fecha,
    modo: z.enum(['renovar', 'solicitar']),
  }),
  llegadas: z.object({
    vehiculo_id: guid,
    ...comunes,
    fase: z.string(),
    eta_el: fecha,
    contenedor: z.string().nullable(),
  }),
  salidas: z.object({
    vehiculo_id: guid,
    ...comunes,
    fase: z.string().nullable(),
    zarpe_el: fecha,
    booking: z.string().nullable(),
    contenedor: z.string().nullable(),
  }),
  sin_resolver: z.object({ vehiculo_id: guid, ...comunes, creado_en: fecha }),
} as const

type Lector<G extends GrupoDeLaBandeja> = (
  crudo: unknown,
) => Extract<FilaDeLaBandeja, { grupo: G }> | null

// Un lector por grupo: valida con el esquema del grupo y arma su fila (el nombre arranca igual que el título; la composición lo reemplaza por la identidad del vehículo).
const LECTORES: { [G in GrupoDeLaBandeja]: Lector<G> } = {
  demorados: (crudo) => {
    const f = esquemas.demorados.safeParse(crudo)
    if (!f.success) return null
    const d = f.data
    return {
      grupo: 'demorados',
      vehiculoId: d.id,
      origenId: d.origen_id,
      titulo: d.titulo,
      nombre: d.titulo,
      faseId: d.fase_id,
      fase: d.fase,
      faseDesde: d.fase_desde,
      situacion: d.situacion,
      dias: d.dias,
    }
  },
  trabados: (crudo) => {
    const f = esquemas.trabados.safeParse(crudo)
    if (!f.success) return null
    const d = f.data
    return {
      grupo: 'trabados',
      vehiculoId: d.id,
      origenId: d.origen_id,
      titulo: d.titulo,
      nombre: d.titulo,
      fase: d.fase,
      faseDesde: d.fase_desde,
      situacion: d.situacion,
      faseSiguiente: d.fase_siguiente,
      motivo: d.motivo,
    }
  },
  por_aprobar: (crudo) => {
    const f = esquemas.por_aprobar.safeParse(crudo)
    if (!f.success) return null
    const d = f.data
    return {
      grupo: 'por_aprobar',
      documentoId: d.documento_id,
      vehiculoId: d.vehiculo_id,
      origenId: d.origen_id,
      titulo: d.titulo,
      nombre: d.titulo,
      tipo: d.tipo,
      creadoEn: d.creado_en,
    }
  },
  por_vencer: (crudo) => {
    const f = esquemas.por_vencer.safeParse(crudo)
    if (!f.success) return null
    const d = f.data
    return {
      grupo: 'por_vencer',
      documentoId: d.documento_id,
      vehiculoId: d.vehiculo_id,
      origenId: d.origen_id,
      titulo: d.titulo,
      nombre: d.titulo,
      tipo: d.tipo,
      venceEl: d.vence_el,
      modo: d.modo,
    }
  },
  llegadas: (crudo) => {
    const f = esquemas.llegadas.safeParse(crudo)
    if (!f.success) return null
    const d = f.data
    return {
      grupo: 'llegadas',
      vehiculoId: d.vehiculo_id,
      origenId: d.origen_id,
      titulo: d.titulo,
      nombre: d.titulo,
      fase: d.fase,
      etaEl: d.eta_el,
      contenedor: d.contenedor,
    }
  },
  salidas: (crudo) => {
    const f = esquemas.salidas.safeParse(crudo)
    if (!f.success) return null
    const d = f.data
    return {
      grupo: 'salidas',
      vehiculoId: d.vehiculo_id,
      origenId: d.origen_id,
      titulo: d.titulo,
      nombre: d.titulo,
      fase: d.fase,
      zarpeEl: d.zarpe_el,
      booking: d.booking,
      contenedor: d.contenedor,
    }
  },
  sin_resolver: (crudo) => {
    const f = esquemas.sin_resolver.safeParse(crudo)
    if (!f.success) return null
    const d = f.data
    return {
      grupo: 'sin_resolver',
      vehiculoId: d.vehiculo_id,
      origenId: d.origen_id,
      titulo: d.titulo,
      nombre: d.titulo,
      creadoEn: d.creado_en,
    }
  },
}

function filaDe(grupo: GrupoDeLaBandeja, crudo: unknown): FilaDeLaBandeja | null {
  const lector: (crudo: unknown) => FilaDeLaBandeja | null = LECTORES[grupo]
  return lector(crudo)
}

const esquemaDelSobre = z.object({
  filas: z.array(z.unknown()),
  hay_mas: z.boolean(),
  siguiente: z.object({ desde: z.string(), id: guid }).nullable(),
  cortada: z.boolean(),
  conteo: z.object({ n: z.number().int().min(0), hay_mas: z.boolean() }).nullable(),
})

/** Lo que devolvió `logistica_bandeja_grupo()` para `grupo`; `inesperado` si el sobre o alguna fila no tiene la forma esperada. */
export function grupoLeidoDesde(
  grupo: GrupoDeLaBandeja,
  datos: unknown,
): Resultado<LecturaDelGrupo> {
  const sobre = esquemaDelSobre.safeParse(datos)
  if (!sobre.success) return fallo('inesperado', MENSAJE_INESPERADO)
  const filas: FilaDeLaBandeja[] = []
  for (const cruda of sobre.data.filas) {
    const fila = filaDe(grupo, cruda)
    if (fila === null) return fallo('inesperado', MENSAJE_INESPERADO)
    filas.push(fila)
  }
  return ok({
    filas,
    hayMas: sobre.data.hay_mas,
    siguiente: sobre.data.siguiente,
    cortada: sobre.data.cortada,
    conteo:
      sobre.data.conteo === null
        ? null
        : { n: sobre.data.conteo.n, hayMas: sobre.data.conteo.hay_mas },
  })
}

/** La clave de una fila en una lista: el documento si lo hay, si no el vehículo. */
export function claveDeLaFila(fila: FilaDeLaBandeja): string {
  return 'documentoId' in fila ? fila.documentoId : fila.vehiculoId
}
