// «Visto» y «último visto» (`docs/GLOSARIO.md`): lo que cada persona abrió en un módulo se marca en sus listas. Abrir la ficha o el resumen de un
// registro lo marca visto *en ese módulo* (`vistos`, por `visto_registrar()`); cada lista lee lo de su página con `vistos_de()`. Sin I/O.
import { z } from 'zod'

// Los mismos valores que el `check` de la tabla.
export const MODULOS_DE_VISTOS = [
  'vehiculos',
  'leads',
  'cotizaciones',
  'agenda',
  'logistica',
  'repuestos',
  'notificaciones',
] as const
export type ModuloDeVistos = (typeof MODULOS_DE_VISTOS)[number]

export const TIPOS_DE_VISTOS = [
  'vehiculo',
  'lead',
  'cotizacion',
  'evento',
  'tarea',
  'proyecto_repuestos',
  'notificacion',
] as const
export type TipoDeVistos = (typeof TIPOS_DE_VISTOS)[number]

// Los tipos de registro que cada módulo puede marcar: el «último visto» es el más reciente del módulo, de cualquiera de ellos. Sólo la agenda
// tiene dos (el calendario muestra eventos y tareas).
export const TIPOS_DEL_MODULO: Record<ModuloDeVistos, readonly TipoDeVistos[]> = {
  vehiculos: ['vehiculo'],
  leads: ['lead'],
  cotizaciones: ['cotizacion'],
  agenda: ['evento', 'tarea'],
  logistica: ['vehiculo'],
  repuestos: ['proyecto_repuestos'],
  notificaciones: ['notificacion'],
}

// Cuánto se recuerda lo visto (el `check` de `preferencias_usuario`).
export const DIAS_DE_VISTOS = [7, 30, 90, 365] as const
export type DiasDeVistos = (typeof DIAS_DE_VISTOS)[number]

export const CLAVE_DE_VISTOS = 'vistos'

// `preferencias_usuario.vistos`: encendido por defecto, 7 días y con «último visto».
export const esquemaPreferenciaDeVistos = z.object({
  activado: z.boolean(),
  dias: z.union([z.literal(7), z.literal(30), z.literal(90), z.literal(365)]),
  ultimo: z.boolean(),
})
export type PreferenciaDeVistos = z.infer<typeof esquemaPreferenciaDeVistos>

export const VISTOS_POR_DEFECTO: PreferenciaDeVistos = { activado: true, dias: 7, ultimo: true }

// Lo guardado completa lo que falte con lo de fábrica; lo que no se entiende es lo de fábrica.
export function preferenciaDeVistosDesde(crudo: unknown): PreferenciaDeVistos {
  const parcial = esquemaPreferenciaDeVistos.partial().safeParse(crudo)
  return parcial.success ? { ...VISTOS_POR_DEFECTO, ...parcial.data } : VISTOS_POR_DEFECTO
}

// Lo que `vistos_de()` devolvió para una página.
export type LecturaDeVistos = { vistos: ReadonlySet<string>; ultimo: string | null }

export const SIN_VISTOS: LecturaDeVistos = { vistos: new Set(), ultimo: null }

const esquemaDeLectura = z.object({
  vistos: z.array(z.object({ id: z.guid() })),
  ultimo: z.guid().nullable(),
})

export function lecturaDeVistosDesde(dato: unknown): LecturaDeVistos | null {
  const leido = esquemaDeLectura.safeParse(dato)
  if (!leido.success) return null
  return { vistos: new Set(leido.data.vistos.map((v) => v.id)), ultimo: leido.data.ultimo }
}

// Cómo se marca una fila: «último visto» si es el último del módulo (y la persona lo quiere ver), «visto» si se abrió, o nada.
export type MarcaDeVisto = 'visto' | 'ultimo' | null

export function marcaDeVisto(
  id: string,
  lectura: LecturaDeVistos,
  preferencia: PreferenciaDeVistos,
): MarcaDeVisto {
  if (!preferencia.activado) return null
  if (preferencia.ultimo && lectura.ultimo === id) return 'ultimo'
  return lectura.vistos.has(id) || lectura.ultimo === id ? 'visto' : null
}

// Abrir un registro lo vuelve el último visto de inmediato, sin esperar a releer.
export function conAbierto(lectura: LecturaDeVistos, id: string): LecturaDeVistos {
  return { vistos: new Set([...lectura.vistos, id]), ultimo: id }
}

// Lo leído de la base más lo abierto en esta pestaña (que la base puede no tener todavía: se registra tras 1 s). Lo abierto manda en el último.
export function unidas(leida: LecturaDeVistos, local: LecturaDeVistos): LecturaDeVistos {
  return {
    vistos: new Set([...leida.vistos, ...local.vistos]),
    ultimo: local.ultimo ?? leida.ultimo,
  }
}

// --- Qué se pide a la base por página ---

// `vistos_de()` mira hasta 100 ids por llamada (`p_ids[1:100]`). Una pantalla marca como mucho 200 por tipo (lo que trae la agenda por clase,
// o el kanban de leads): con más, se marcan 200 (los de menor id, no los primeros dibujados) y el resto se ve sin marca.
export const IDS_POR_LLAMADA = 100
export const TOPE_DE_IDS_POR_TIPO = 200

export type ConsultaDeVistos = { tipo: TipoDeVistos; ids: readonly string[] }

// Los ids de un tipo, únicos, ordenados y hasta el tope, en tandas de lo que cabe en una llamada.
export function tandasDeIds(ids: readonly string[]): string[][] {
  const unicos = [...new Set(ids)].sort().slice(0, TOPE_DE_IDS_POR_TIPO)
  const tandas: string[][] = []
  for (let desde = 0; desde < unicos.length; desde += IDS_POR_LLAMADA) {
    tandas.push(unicos.slice(desde, desde + IDS_POR_LLAMADA))
  }
  return tandas
}

// Qué lee una pantalla, como texto: los ids únicos y ordenados de cada tipo. Mover una tarjeta o reordenar una lista no cambia la firma, así que
// no vuelve a leer. Una consulta sin ids no entra; nada que leer da `''`.
export function firmaDeConsultas(consultas: readonly ConsultaDeVistos[]): string {
  const porTipo = new Map<TipoDeVistos, string[]>()
  for (const { tipo, ids } of consultas) porTipo.set(tipo, [...(porTipo.get(tipo) ?? []), ...ids])
  return [...porTipo.entries()]
    .map(([tipo, ids]) => ({ tipo, ids: tandasDeIds(ids).flat() }))
    .filter((consulta) => consulta.ids.length > 0)
    .sort((a, b) => a.tipo.localeCompare(b.tipo))
    .map(({ tipo, ids }) => `${tipo}:${ids.join(',')}`)
    .join('|')
}

export function consultasDeLaFirma(firma: string): ConsultaDeVistos[] {
  if (firma === '') return []
  return firma.split('|').flatMap((parte) => {
    const [tipo, ids] = parte.split(':')
    const conocido = TIPOS_DE_VISTOS.find((uno) => uno === tipo)
    return conocido === undefined || !ids ? [] : [{ tipo: conocido, ids: ids.split(',') }]
  })
}

// El último visto del módulo cuando varios de sus tipos tienen uno: el de `visto_en` más reciente (nulo si ninguno).
export function ultimoDelContexto(
  candidatos: readonly { id: string; vistoEn: string }[],
): string | null {
  let mejor: { id: string; vistoEn: number } | null = null
  for (const { id, vistoEn } of candidatos) {
    const cuando = Date.parse(vistoEn)
    if (Number.isNaN(cuando)) continue
    if (mejor === null || cuando > mejor.vistoEn) mejor = { id, vistoEn: cuando }
  }
  return mejor?.id ?? null
}

// El id que trae un parámetro de la URL (`?cotizacion=`, `?evento=`): un uuid en minúsculas, o nulo. Lo inválido no se registra.
export function idDeLaUrl(texto: string | null | undefined): string | null {
  const id = z.guid().safeParse(texto)
  return id.success ? id.data.toLowerCase() : null
}
