// Con qué nace el editor de la tarjeta (la cuadrícula, forma 2) y cómo se alinea con la fórmula una forma 1 antes de convertirla. Reglas puras, sin I/O. Lo que la
// plantilla guardada dice y la fórmula de hoy ya no (un grupo que se quitó, una etiqueta de un nodo que ya no tiene lugar) se corrige aquí y se avisa; lo alineado y
// convertido no se guarda solo: es un cambio de quien edita.
import type { PlantillaEnCuadricula } from '../cuadricula-de-la-tarjeta'
import { btrim } from '../json-de-la-base'
import { FILAS_POR_GRUPO_EN_LA_VISTA_PREVIA } from '../vista-previa-de-la-plantilla'
import { convertirPlantilla } from './convertir-plantilla'
import type { Plantilla } from './forma-de-plantilla'
import type { VersionDePlantilla } from './lectura-de-la-plantilla'
import { lugaresDe } from './nodos-de-plantilla'
import { revisarLaGrilla } from './reglas-de-la-grilla'
import type { ContextoDePlantilla } from './validar-plantilla'

export type DeDondeNace = 'borrador' | 'publicada' | 'omision'

const TOPE_DEL_TOTAL = 40

const etiquetaDelGrupo = (contexto: ContextoDePlantilla, id: string): string =>
  contexto.definicion.grupos?.find((g) => g.id === id)?.etiqueta || id
const etiquetaDelNodo = (contexto: ContextoDePlantilla, id: string): string =>
  contexto.definicion.nodos?.find((n) => n.id === id)?.etiqueta || id

function sinLasClavesSinLugar(
  d: Readonly<Record<string, string>> | undefined,
  lugar: ReadonlySet<string>,
  avisar: (id: string) => string,
  avisos: string[],
): Readonly<Record<string, string>> | undefined {
  if (d === undefined) return undefined
  const quedan = Object.entries(d).filter(([k]) => lugar.has(k))
  for (const [k] of Object.entries(d)) if (!lugar.has(k)) avisos.push(avisar(k))
  return quedan.length === 0 ? undefined : Object.fromEntries(quedan)
}

// Quita el grupo que la fórmula ya no tiene y el repetido (el segundo), suma al final y sin tono el que falta, y quita la etiqueta o la leyenda de un nodo que ya no tiene
// lugar en la tarjeta. No muta su entrada.
export function alinearConLaFormula(
  plantilla: Plantilla,
  contexto: ContextoDePlantilla,
): { plantilla: Plantilla; avisos: string[] } {
  const avisos: string[] = []
  const deLaFormula = (contexto.definicion.grupos ?? []).map((g) => g.id)
  const existentes = new Set(deLaFormula)
  const vistos = new Set<string>()
  const grupos = plantilla.grupos.filter((g) => {
    if (!existentes.has(g.grupo)) {
      avisos.push(`El grupo «${g.grupo}» ya no está en la fórmula: se quitó.`)
      return false
    }
    if (vistos.has(g.grupo)) {
      avisos.push(
        `El grupo «${etiquetaDelGrupo(contexto, g.grupo)}» estaba repetido: se quitó el segundo.`,
      )
      return false
    }
    vistos.add(g.grupo)
    return true
  })
  const nuevos = deLaFormula.filter((id) => !vistos.has(id))
  for (const id of nuevos) {
    avisos.push(
      `El grupo «${etiquetaDelGrupo(contexto, id)}» es nuevo en la fórmula: se sumó al final, sin color.`,
    )
  }
  const { lugar } = lugaresDe(contexto)
  const sinLugar = (id: string, de: 'etiqueta' | 'leyenda') =>
    `La ${de} de «${etiquetaDelNodo(contexto, id)}» ya no tiene lugar en la tarjeta: se quitó.`
  const etiquetas = sinLasClavesSinLugar(
    plantilla.etiquetas,
    lugar,
    (id) => sinLugar(id, 'etiqueta'),
    avisos,
  )
  const leyendas = sinLasClavesSinLugar(
    plantilla.leyendas,
    lugar,
    (id) => sinLugar(id, 'leyenda'),
    avisos,
  )
  const { etiquetas: _e, leyendas: _l, ...resto } = plantilla
  return {
    plantilla: {
      ...resto,
      grupos: [...grupos, ...nuevos.map((grupo) => ({ grupo }))],
      ...(etiquetas === undefined ? {} : { etiquetas }),
      ...(leyendas === undefined ? {} : { leyendas }),
    },
    avisos,
  }
}

// La plantilla de un origen que no tiene ninguna: los grupos de la fórmula en su orden, sin tono, y el total con la etiqueta del nodo que lo da.
function omision(contexto: ContextoDePlantilla): Plantilla {
  const total = contexto.definicion.nodos?.find((n) => n.salida === 'total')?.etiqueta ?? ''
  const etiqueta = btrim(total) === '' ? 'Total' : [...total].slice(0, TOPE_DEL_TOTAL).join('')
  return {
    grupos: (contexto.definicion.grupos ?? []).map((g) => ({ grupo: g.id })),
    total: { etiqueta },
    logo: true,
    columnas: { leyenda: false, plazo: false, tipo_cambio: false },
  }
}

// Lo que se dice al abrir.
export const AVISO_DE_LA_CONVERSION = 'Se convirtió a cuadrícula: revisa y guarda.'
export const AVISO_DE_LA_OMISION = 'Todavía no hay tarjeta: nace de la de por omisión.'
export const AVISO_DEL_CORTE = `La fórmula tiene más filas de las que entran en una tarjeta: se tomaron las primeras ${String(FILAS_POR_GRUPO_EN_LA_VISTA_PREVIA)} de cada grupo. Revisa y guarda.`
export const AVISO_SOLO_EL_TOTAL =
  'La fórmula tiene más filas de las que entran en una tarjeta: quedó sólo el total. Revisa y guarda.'

// El contexto con a lo sumo `FILAS_POR_GRUPO_EN_LA_VISTA_PREVIA` miembros por grupo.
function conPocosMiembros(contexto: ContextoDePlantilla): ContextoDePlantilla {
  const porGrupo = new Map<string, number>()
  const nodos = (contexto.definicion.nodos ?? []).filter((n) => {
    if (n.grupo == null) return true
    const vistos = porGrupo.get(n.grupo) ?? 0
    porGrupo.set(n.grupo, vistos + 1)
    return vistos < FILAS_POR_GRUPO_EN_LA_VISTA_PREVIA
  })
  return { ...contexto, definicion: { ...contexto.definicion, nodos } }
}

// Una forma 1 convertida a la cuadrícula como la convierte la base al leerla. Si lo convertido no entra en la grilla (más de 120 filas o 1.000 celdas: una fórmula con
// cientos de miembros), se convierte otra vez con los primeros miembros de cada grupo y, si tampoco, sólo con el total. No se mide contra los 24 KiB (D12): guardar sí.
function convertida(
  plantilla: Plantilla,
  contexto: ContextoDePlantilla,
  tonos: readonly string[],
): { cuadricula: PlantillaEnCuadricula; aviso: string | null } {
  const entera = convertirPlantilla(plantilla, contexto, tonos)
  if (revisarLaGrilla(entera) === null) return { cuadricula: entera, aviso: null }
  const cortada = convertirPlantilla(plantilla, conPocosMiembros(contexto), tonos)
  if (revisarLaGrilla(cortada) === null) return { cuadricula: cortada, aviso: AVISO_DEL_CORTE }
  return {
    cuadricula: convertirPlantilla({ ...plantilla, grupos: [] }, contexto, tonos),
    aviso: AVISO_SOLO_EL_TOTAL,
  }
}

type Base =
  | { forma: 1; plantilla: Plantilla; de: DeDondeNace }
  | { forma: 2; cuadricula: PlantillaEnCuadricula; de: DeDondeNace }

function legible(v: VersionDePlantilla | null, de: DeDondeNace): Base | null {
  if (v === null || 'motivo' in v.contenido) return null
  return v.contenido.forma === 1
    ? { forma: 1, plantilla: v.contenido.plantilla, de }
    : { forma: 2, cuadricula: v.contenido.cuadricula, de }
}

const motivoDe = (v: VersionDePlantilla) => ('motivo' in v.contenido ? v.contenido.motivo : '')

// La versión legible de la que se parte (el borrador, si no la publicada) y lo que se dice de las que no se pudieron leer.
function deDondeNace(
  borrador: VersionDePlantilla | null,
  publicada: VersionDePlantilla | null,
): { base: Base | null; avisos: string[] } {
  const avisos: string[] = []
  const delBorrador = legible(borrador, 'borrador')
  if (delBorrador === null && borrador) {
    avisos.push(
      `El borrador guardado no se pudo leer (${motivoDe(borrador) || 'sin motivo'}): al guardar se reemplaza.`,
    )
  }
  const base = delBorrador ?? legible(publicada, 'publicada')
  if (base === null && publicada) {
    avisos.push(
      `La versión ${String(publicada.version ?? '')} publicada no se pudo leer (${motivoDe(publicada) || 'sin motivo'}): se parte de la de por omisión.`,
    )
  }
  return { base, avisos }
}

// Con qué nace el editor de la tarjeta, que escribe sólo la forma 2: el borrador si se pudo leer; si no, la copia de la publicada; si tampoco, la de por omisión. Una
// versión ilegible no se edita a medias: se dice por qué y se parte de lo que sigue. Una cuadrícula se usa tal cual; una forma 1 se alinea con la fórmula
// (`alinearConLaFormula()`) y se convierte, y lo dice (no se guarda sola).
export function cuadriculaParaEditar({
  borrador,
  publicada,
  contexto,
  tonos,
}: {
  borrador: VersionDePlantilla | null
  publicada: VersionDePlantilla | null
  contexto: ContextoDePlantilla
  tonos: readonly string[]
}): { cuadricula: PlantillaEnCuadricula; de: DeDondeNace; avisos: string[] } {
  const { base, avisos } = deDondeNace(borrador, publicada)
  if (base?.forma === 2) return { cuadricula: base.cuadricula, de: base.de, avisos }
  const deLaForma1 = base?.forma === 1
  const alineada = alinearConLaFormula(base === null ? omision(contexto) : base.plantilla, contexto)
  const { cuadricula, aviso } = convertida(alineada.plantilla, contexto, tonos)
  return {
    cuadricula,
    de: base?.de ?? 'omision',
    avisos: [
      ...avisos,
      deLaForma1 ? AVISO_DE_LA_CONVERSION : AVISO_DE_LA_OMISION,
      ...(aviso === null ? [] : [aviso]),
      ...(deLaForma1 ? alineada.avisos : []),
    ],
  }
}
