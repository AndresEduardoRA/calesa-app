// Los textos de los selects del aspecto (docs/UX.md › «Cotización: diseño (estados propios)»).
import {
  COLUMNAS_DE_LA_REJILLA,
  DENSIDADES_DE_SECCION,
  ENFASIS,
  LETRAS,
  MAXIMO_DE_FILAS,
  RELLENOS,
  SEPARACIONES,
} from '../../../../entities/diseno'

type Opcion = { valor: string; etiqueta: string }

// El valor del select que quita la clave («Automático»).
export const AUTOMATICO = ''

export const ALTO_SIN_EFECTO = 'Con 12 columnas ocupa su fila: el alto no cambia nada.'
export const SIN_CATALOGO = 'No se pudo leer el catálogo de colores.'

export function etiquetaDeColumnas(n: number): string {
  if (n === COLUMNAS_DE_LA_REJILLA) return `${String(n)} columnas (toda la fila)`
  if (n === 6) return '6 columnas (la mitad)'
  if (n === 4) return '4 columnas (un tercio)'
  return n === 1 ? '1 columna' : `${String(n)} columnas`
}

export const OPCIONES_DE_COLUMNAS: readonly Opcion[] = Array.from(
  { length: COLUMNAS_DE_LA_REJILLA },
  (_, i) => {
    const n = COLUMNAS_DE_LA_REJILLA - i
    return { valor: String(n), etiqueta: etiquetaDeColumnas(n) }
  },
)

export const OPCIONES_DE_FILAS: readonly Opcion[] = [
  { valor: AUTOMATICO, etiqueta: 'Automático' },
  ...Array.from({ length: MAXIMO_DE_FILAS - 1 }, (_, i) => ({
    valor: String(i + 2),
    etiqueta: `${String(i + 2)} filas`,
  })),
]

const ETIQUETAS = {
  chico: 'Chico',
  chica: 'Chica',
  medio: 'Medio',
  media: 'Media',
  grande: 'Grande',
  compacta: 'Compacta',
  comoda: 'Cómoda',
  normal: 'Normal',
  fuerte: 'Fuerte',
} as const

const opciones = (valores: readonly (keyof typeof ETIQUETAS)[]): readonly Opcion[] =>
  valores.map((valor) => ({ valor, etiqueta: ETIQUETAS[valor] }))

export const OPCIONES_DE_RELLENO = opciones(RELLENOS)
export const OPCIONES_DE_SEPARACION = opciones(SEPARACIONES)
export const OPCIONES_DE_DENSIDAD = opciones(DENSIDADES_DE_SECCION)
export const OPCIONES_DE_LETRA = opciones(LETRAS)
export const OPCIONES_DE_ENFASIS = opciones(ENFASIS)

// El alto que muestra el select: 1 o ninguno es «Automático».
export const valorDelAlto = (alto: number | undefined) =>
  alto === undefined || alto < 2 ? AUTOMATICO : String(alto)
export const altoElegido = (valor: string): number | null =>
  valor === AUTOMATICO ? null : Number(valor)

// El error de una clave, si el rechazo de forma es de ella.
export type ErrorDelAspecto = { clave: string; mensaje: string } | null
export const errorDe = (error: ErrorDelAspecto, clave: string) =>
  error?.clave === clave ? error.mensaje : undefined
