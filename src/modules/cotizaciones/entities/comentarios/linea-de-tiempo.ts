// «Todo» del resumen de una cotización: los adjuntos, las revisiones y los comentarios en una sola línea de tiempo, lo más nuevo arriba. Se lee una página de cada fuente
// (cada una por cursor, la de adjuntos entera: son a lo sumo 20) y se mezclan; nunca la historia entera. Puro: sin I/O.
//
// Mezclar páginas de fuentes distintas sólo es correcto hasta donde todas llegaron: si los comentarios llegaron hasta ayer y las revisiones hasta el mes pasado, lo de hace dos
// semanas todavía puede tener un comentario sin leer. Por eso sólo se dibuja lo más nuevo que la fuente que menos retrocedió (y todavía tiene más) ya cubrió; lo que se leyó
// de más espera, sin perderse, a que «Ver más» le pida su página a esa fuente.
import type { RevisionDeLaCotizacion } from '../revisiones'
import type { Adjunto } from './adjunto'
import type { ComentarioRaiz } from './comentario'
import { microsegundos } from './lista'

export type FuenteDeLaLinea = 'adjuntos' | 'revisiones' | 'comentarios'

export type EntradaDeLaLinea =
  | { tipo: 'adjunto'; id: string; en: string; adjunto: Adjunto }
  | { tipo: 'revision'; id: string; en: string; revision: RevisionDeLaCotizacion }
  | { tipo: 'comentario'; id: string; en: string; comentario: ComentarioRaiz }

// Lo leído de una fuente: sus ítems de la más nueva a la más vieja y si la base tiene más atrás. `leida` es falso mientras no llegó su primera página: no se sabe qué hay.
export type LecturaDeUnaFuente<T> = { items: readonly T[]; hayMas: boolean; leida: boolean }

export type LecturasDeLaLinea = {
  adjuntos: LecturaDeUnaFuente<Adjunto>
  revisiones: LecturaDeUnaFuente<RevisionDeLaCotizacion>
  comentarios: LecturaDeUnaFuente<ComentarioRaiz>
}

export type LineaDeTiempo = {
  // Lo que ya se puede dibujar sin saltarse nada, de lo más nuevo a lo más viejo.
  entradas: EntradaDeLaLinea[]
  // Las fuentes a las que «Ver más» tiene que pedirles su página siguiente: las que marcan hasta dónde llega lo dibujado. Vacío si no hay más atrás.
  porPedir: FuenteDeLaLinea[]
}

// Cuando varias entradas son del mismo instante, el orden no cambia entre lecturas: tipo y luego id.
const ORDEN_DEL_TIPO: Record<EntradaDeLaLinea['tipo'], number> = {
  comentario: 0,
  revision: 1,
  adjunto: 2,
}

export function esMasNueva(a: EntradaDeLaLinea, b: EntradaDeLaLinea): number {
  const diferencia = microsegundos(b.en) - microsegundos(a.en)
  if (diferencia !== 0) {
    return diferencia
  }
  const tipos = ORDEN_DEL_TIPO[a.tipo] - ORDEN_DEL_TIPO[b.tipo]
  if (tipos !== 0) {
    return tipos
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

function entradasDe(lecturas: LecturasDeLaLinea): EntradaDeLaLinea[] {
  return [
    ...lecturas.adjuntos.items.map((adjunto): EntradaDeLaLinea => ({
      tipo: 'adjunto',
      id: adjunto.id,
      en: adjunto.creadoEn,
      adjunto,
    })),
    ...lecturas.revisiones.items.map((revision): EntradaDeLaLinea => ({
      tipo: 'revision',
      id: String(revision.id),
      en: revision.creadoEn,
      revision,
    })),
    ...lecturas.comentarios.items.map((comentario): EntradaDeLaLinea => ({
      tipo: 'comentario',
      id: comentario.id,
      en: comentario.creadoEn,
      comentario,
    })),
  ].sort(esMasNueva)
}

// El instante más viejo que cubre una fuente con más atrás; null si no tiene más (cubre hasta el principio). Una fuente sin primera página no cubre nada todavía.
function cobertura(lectura: LecturaDeUnaFuente<{ creadoEn: string }>): number | null {
  if (!lectura.hayMas) {
    return null
  }
  const masVieja = lectura.items.at(-1)
  return masVieja === undefined ? Number.POSITIVE_INFINITY : microsegundos(masVieja.creadoEn)
}

export function lineaDeTiempo(lecturas: LecturasDeLaLinea): LineaDeTiempo {
  const todas = entradasDe(lecturas)
  const fuentes = ['adjuntos', 'revisiones', 'comentarios'] as const
  const cubiertas = fuentes.map((fuente) => ({ fuente, hasta: cobertura(lecturas[fuente]) }))
  const limites = cubiertas.flatMap((c) => (c.hasta === null ? [] : [c.hasta]))
  if (limites.length === 0) {
    return { entradas: todas, porPedir: [] }
  }
  // La que menos retrocedió marca el borde: nada más viejo que su última entrada es seguro.
  const borde = Math.max(...limites)
  return {
    entradas: todas.filter((entrada) => microsegundos(entrada.en) >= borde),
    porPedir: cubiertas.flatMap((c) => (c.hasta === borde ? [c.fuente] : [])),
  }
}

// Cuántas entradas se leyeron en total (lo dibujado y lo que espera): lo que se compara con `TOPE_DE_LO_CARGADO`.
export function entradasLeidas(lecturas: LecturasDeLaLinea): number {
  return (
    lecturas.adjuntos.items.length +
    lecturas.revisiones.items.length +
    lecturas.comentarios.items.length
  )
}

// Si las tres fuentes ya trajeron su primera página.
export function todasLeidas(lecturas: LecturasDeLaLinea): boolean {
  return lecturas.adjuntos.leida && lecturas.revisiones.leida && lecturas.comentarios.leida
}
