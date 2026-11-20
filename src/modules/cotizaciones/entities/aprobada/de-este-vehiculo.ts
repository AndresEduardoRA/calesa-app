// «De este vehículo» (`docs/GLOSARIO.md`): las otras cotizaciones del vehículo de una cotización, con la aprobada primero y «Aprobar esta» en cada fila. Lo que llega de
// `cotizaciones_de_este_vehiculo()`, el orden de lo que se dibuja, los motivos del botón y los textos. Nada de React ni de Supabase.
import { z } from 'zod'
import { conteoEnFrase, cortarAlTope, type ConteoAcotado } from '@/shared/lib/conteo'
import { TOPE_DE_ESTE_VEHICULO } from '@/shared/lib/paginacion'
import { tituloDeLaCotizacion } from '../titulo-de-la-cotizacion'
import { ES_INVALIDA } from './acceso'

export const ETIQUETA_DE_ESTA = 'Esta'
export const ETIQUETA_DE_VENCIDA = 'Vencida'

// Dónde aprueba quien mira (`origenesCon(permisos, 'cotizaciones.aprobar')`, lo calcula el servidor): en todos los orígenes o en esos ids.
export type AprobarEn = 'todos' | readonly string[]

export type FilaDeEsteVehiculo = {
  id: string
  numero: number
  origenId: string
  // El nombre del origen, para el motivo sin permiso.
  origen: string | null
  clase: 'preventa' | 'final'
  estado: 'activa' | 'reportada' | 'invalida'
  titulo: string | null
  totalBase: number
  monedaMostrar: string | null
  // El nombre del modo de tipo de cambio con el que se guardó, o nada.
  modo: string | null
  autor: string
  // Como lo devolvió la base: el cursor y la versión no pasan por `Date` (perderían los microsegundos).
  creadoEn: string
  actualizadoEn: string
  vencida: boolean
  // Hasta cuándo vale (la fecha, en la zona de la empresa).
  venceEl: string
  aprobada: boolean
  // Privada (la insignia de la tarjeta). Aprobarla la hace pública: la pregunta la abre la respuesta de la base (`alSerPrivada`), con la marca al día.
  privada: boolean
}

export type PaginaDeEsteVehiculo = {
  // La aprobada del vehículo, que llega aparte en la primera página (puede estar fuera de las que se leen).
  fijada: FilaDeEsteVehiculo | null
  filas: FilaDeEsteVehiculo[]
}

// Una página leída: la fijada aparte, las filas de la página y el cursor de la siguiente (nulo si no hay).
export type PaginaLeidaDeEsteVehiculo = PaginaDeEsteVehiculo & { siguiente: string | null }

const esquemaDeLaFila = z.object({
  id: z.guid(),
  numero: z.number(),
  origen_id: z.guid(),
  origen: z.string().nullable(),
  clase: z.enum(['preventa', 'final']),
  estado: z.enum(['activa', 'reportada', 'invalida']),
  titulo: z.string().nullable(),
  total: z.number(),
  moneda: z.string().nullable(),
  modo: z.string().nullable(),
  autor: z.string(),
  creado_en: z.string(),
  editada_en: z.string(),
  vencida: z.boolean(),
  vence_el: z.string(),
  aprobada: z.boolean(),
  fijada: z.boolean(),
  privada: z.boolean(),
})

// Una fila que no cumple hace de la lectura un error (`null`), no una fila: el cursor no sabría por dónde seguir.
export function paginaDeEsteVehiculoDesde(filas: unknown): PaginaDeEsteVehiculo | null {
  const leidas = z.array(esquemaDeLaFila).safeParse(filas)
  if (!leidas.success) {
    return null
  }
  const pagina: PaginaDeEsteVehiculo = { fijada: null, filas: [] }
  for (const fila of leidas.data) {
    const leida: FilaDeEsteVehiculo = {
      id: fila.id,
      numero: fila.numero,
      origenId: fila.origen_id,
      origen: fila.origen,
      clase: fila.clase,
      estado: fila.estado,
      titulo: fila.titulo,
      totalBase: fila.total,
      monedaMostrar: fila.moneda?.trim() || null,
      modo: fila.modo,
      autor: fila.autor,
      creadoEn: fila.creado_en,
      actualizadoEn: fila.editada_en,
      vencida: fila.vencida,
      venceEl: fila.vence_el,
      aprobada: fila.aprobada,
      privada: fila.privada,
    }
    if (fila.fijada) {
      pagina.fijada = leida
    } else {
      pagina.filas.push(leida)
    }
  }
  return pagina
}

// Lo que se dibuja: la aprobada primero (la fijada o, si no llegó, la que lo diga), cada cotización una vez y nunca más del tope.
export function filasALaVista({ fijada, filas }: PaginaDeEsteVehiculo): FilaDeEsteVehiculo[] {
  const aprobada = fijada ?? filas.find((fila) => fila.aprobada) ?? null
  const resto = aprobada === null ? filas : filas.filter((fila) => fila.id !== aprobada.id)
  const vistas = new Set<string>()
  const unicas = (aprobada === null ? resto : [aprobada, ...resto]).filter((fila) => {
    if (vistas.has(fila.id)) {
      return false
    }
    vistas.add(fila.id)
    return true
  })
  return cortarAlTope(unicas, TOPE_DE_ESTE_VEHICULO).filas
}

// Hay al menos una cotización del vehículo que no es la que se mira: si no, el bloque no se dibuja.
export function hayOtras(
  filas: readonly Pick<FilaDeEsteVehiculo, 'id'>[],
  actualId?: string,
): boolean {
  return filas.some((fila) => fila.id !== actualId)
}

export function puedeAprobarEn(aprobarEn: AprobarEn, origenId: string): boolean {
  return aprobarEn === 'todos' || aprobarEn.includes(origenId)
}

export function sinPermisoEn(origen: string | null): string {
  return `Para aprobar hace falta permiso en ${origen === null ? 'este origen' : `«${origen}»`}: pídeselo a quien administra los roles.`
}

// Por qué «Aprobar esta» queda apagado (nulo = se puede), en el orden de la base: el permiso del origen y después inválida. La vencida se aprueba.
export function motivoParaNoAprobarEsta(
  fila: Pick<FilaDeEsteVehiculo, 'origenId' | 'origen' | 'estado'>,
  aprobarEn: AprobarEn,
): string | null {
  if (!puedeAprobarEn(aprobarEn, fila.origenId)) {
    return sinPermisoEn(fila.origen)
  }
  return fila.estado === 'invalida' ? ES_INVALIDA : null
}

// La línea bajo la cabecera de la guardada: «Hay 2 cotizaciones más de este vehículo». Nula sin otras.
export function textoDeLaLinea(conteo: ConteoAcotado): string | null {
  if (conteo.n === 0) {
    return null
  }
  const sustantivo = !conteo.hayMas && conteo.n === 1 ? 'cotización' : 'cotizaciones'
  return `Hay ${conteoEnFrase(conteo)} ${sustantivo} más de este vehículo`
}

// El título de una fila: el suyo, si no el del vehículo, si no «Cotización n.º N» (`tituloDeLaCotizacion()`, la regla de toda superficie).
export function tituloDeLaFila(
  fila: Pick<FilaDeEsteVehiculo, 'titulo' | 'numero'>,
  tituloDelVehiculo: string | null,
): string {
  return (
    tituloDeLaCotizacion({ titulo: fila.titulo, vehiculo: tituloDelVehiculo, numero: fila.numero })
      ?.texto ?? `Cotización n.º ${String(fila.numero)}`
  )
}
