// Lo que arma la conversión de la forma 1 a la cuadrícula (`convertir-plantilla.ts`): las columnas que van, y cada fila con sus celdas en orden de columna,
// sus ids derivados y su alto estimado (D11). Puro.
import {
  COLUMNAS_DE_LA_CONVERSION,
  type CeldaDeLaTarjeta,
  type ContenidoDeLaCelda,
  type EstiloDeLaCelda,
  type FilaDeLaTarjeta,
  type Mostrar,
} from '../cuadricula-de-la-tarjeta'
import { altoDeLaFila, altoDeRenglones, altoDeTexto } from './altos-de-la-conversion'
import { idDeLaCelda } from './ids-de-la-conversion'
import type { Plantilla } from './forma-de-plantilla'
import { btrim } from './json-de-la-base'
import type { ContextoDeNodos, NodoParaPlantilla } from './nodos-de-plantilla'

export type Columna = (typeof COLUMNAS_DE_LA_CONVERSION)[number]
export type IdDeColumna = Columna['id']

// Una celda por armar: desde qué columna y hasta cuál, cuántas filas abarca, qué muestra, su estilo y el texto con que se mide su alto (o sus renglones).
export type Pieza = {
  readonly columna: IdDeColumna
  readonly hasta?: IdDeColumna
  readonly filas?: number
  readonly contenido: ContenidoDeLaCelda
  readonly estilo?: EstiloDeLaCelda
  readonly medida?: string
  readonly renglones?: number
}

export const FINO = { todos: 'fino' } as const
export const texto = (t: string): ContenidoDeLaCelda => ({ tipo: 'texto', texto: t })
export const variable = (v: string): ContenidoDeLaCelda => ({ tipo: 'dato', variable: v })
export const dato = (nodo: string, mostrar: Mostrar): ContenidoDeLaCelda => ({
  tipo: 'dato',
  nodo,
  mostrar,
})
export const conFondo = (fondo: string | null, estilo: EstiloDeLaCelda): EstiloDeLaCelda =>
  fondo === null ? estilo : { fondo, ...estilo }

// Las columnas de hoy, en orden y sólo las que van: el grupo si hay algún grupo con miembros, concepto y monto siempre, y la leyenda, el tipo de cambio y el
// plazo según `columnas` (estos dos, sólo con la columna del grupo).
export function columnasDe(plantilla: Plantilla, conGrupo: boolean): Columna[] {
  const van: Record<IdDeColumna, boolean> = {
    grupo: conGrupo,
    concepto: true,
    monto: true,
    leyenda: plantilla.columnas.leyenda,
    tipo_cambio: plantilla.columnas.tipo_cambio && conGrupo,
    plazo: plantilla.columnas.plazo && conGrupo,
  }
  return COLUMNAS_DE_LA_CONVERSION.filter((c) => van[c.id])
}

export class Armado {
  readonly filas: FilaDeLaTarjeta[] = []
  readonly celdas: CeldaDeLaTarjeta[] = []
  private readonly indice: ReadonlyMap<string, number>

  constructor(readonly columnas: readonly Columna[]) {
    this.indice = new Map(columnas.map((c, i) => [c.id, i]))
  }

  posicion(id: IdDeColumna): number {
    return this.indice.get(id) ?? -1
  }

  tiene(id: IdDeColumna): boolean {
    return this.indice.has(id)
  }

  // La columna anterior a otra (la primera si no hay).
  anterior(id: IdDeColumna): IdDeColumna {
    return this.columnas[this.posicion(id) - 1]?.id ?? 'concepto'
  }

  // El alto de una pieza de una fila: el de su texto en el ancho de sus columnas, o el de sus renglones. Nulo si abarca más de una fila (no cuenta).
  private alto(p: Pieza, desde: number, hasta: number): number | null {
    if ((p.filas ?? 1) > 1) return null
    const tamano = p.estilo?.tamano ?? 12
    if (p.renglones !== undefined) return altoDeRenglones(p.renglones, tamano)
    const ancho = this.columnas.slice(desde, hasta + 1).reduce((s, c) => s + c.ancho, 0)
    return altoDeTexto(p.medida ?? '', ancho, tamano)
  }

  private celda(fila: string, p: Pieza, abarca: number): CeldaDeLaTarjeta {
    const filas = p.filas ?? 1
    return {
      id: p.contenido.tipo === 'logo' ? 'c_logo' : idDeLaCelda(fila, p.columna),
      fila,
      columna: p.columna,
      ...(abarca > 1 ? { abarca_columnas: abarca } : {}),
      ...(filas > 1 ? { abarca_filas: filas } : {}),
      contenido: p.contenido,
      ...(p.estilo === undefined ? {} : { estilo: p.estilo }),
    }
  }

  // La fila con sus celdas en orden de columna; su alto es el mayor de sus celdas de una fila, entre 16 y 240 (D11). Con `nodo`, se oculta si no aplica.
  fila(id: string, piezas: readonly Pieza[], nodo?: string): void {
    const altos: number[] = []
    for (const p of piezas) {
      const desde = this.posicion(p.columna)
      const hasta = p.hasta === undefined ? desde : this.posicion(p.hasta)
      const alto = this.alto(p, desde, hasta)
      if (alto !== null) altos.push(alto)
      this.celdas.push(this.celda(id, p, hasta - desde + 1))
    }
    const alto = altoDeLaFila(altos)
    this.filas.push(
      nodo === undefined
        ? { id, alto, ocultar_si: 'nunca' }
        : { id, alto, ocultar_si: 'no_aplica', nodo },
    )
  }
}

export type Conversion = {
  readonly a: Armado
  readonly plantilla: Plantilla
  readonly contexto: ContextoDeNodos
  readonly nodos: readonly NodoParaPlantilla[]
  readonly catalogo: ReadonlySet<string>
  // La primera, la segunda y la última columna, y la última de los textos del encabezado (sin la del logo al costado).
  readonly primera: IdDeColumna
  readonly segunda: IdDeColumna
  readonly ultima: IdDeColumna
  readonly finDelEncabezado: IdDeColumna
  readonly logoAlCostado: boolean
}

export const escrito = (dic: Readonly<Record<string, string>> | undefined, id: string) =>
  dic !== undefined && Object.hasOwn(dic, id) ? dic[id] : undefined
export const conTexto = (t: string | undefined): t is string => t !== undefined && btrim(t) !== ''
export const miembrosDe = (nodos: readonly NodoParaPlantilla[], grupo: string) =>
  nodos.filter((n) => n.grupo === grupo)
