// El estilo con que se dibuja una celda de la tarjeta, resuelto: los colores en hex (una clave del catálogo, o `auto`: fondo blanco y el texto de más
// contraste, D3 y D9 de T310; un color que ya no está se dibuja `auto`), los valores por omisión de lo que falta (D1) y cada borde en px (D2: un lado gana sobre
// `todos`). Lo pintan igual el HTML, el PDF y la imagen.
import {
  COLOR_AUTOMATICO,
  ESTILO_POR_OMISION,
  type Borde,
  type EstiloDeLaCelda,
  type Lado,
} from '../cuadricula-de-la-tarjeta'
import { textoAutomatico } from '../colores'

export const FONDO_AUTOMATICO = '#ffffff'
// Lo que una celda deja entre su borde exterior y su texto, por lado y con el borde adentro: el relleno es esto menos el grosor del borde. Así el texto tiene
// siempre `alto − 8` px, lo que supone el alto estimado de la conversión (D11 de T310), y un renglón de más no se corta.
export const RELLENO_DE_LA_CELDA = 4

export type GrosorDelBorde = 0 | 1 | 2
export type BordesDibujados = {
  arriba: GrosorDelBorde
  derecha: GrosorDelBorde
  abajo: GrosorDelBorde
  izquierda: GrosorDelBorde
}

export type EstiloDibujado = {
  fondo: string
  texto: string
  negrita: boolean
  cursiva: boolean
  tamano: number
  alinear: 'izquierda' | 'centro' | 'derecha'
  alinearVertical: 'arriba' | 'centro' | 'abajo'
  bordes: BordesDibujados
}

const GROSOR: Record<Borde, GrosorDelBorde> = { ninguno: 0, fino: 1, grueso: 2 }

// El hex de una clave del catálogo; nulo con `auto`, sin clave o con un color que ya no está.
const hexDe = (clave: string | undefined, colores: ReadonlyMap<string, string>) =>
  clave === undefined || clave === COLOR_AUTOMATICO ? null : (colores.get(clave) ?? null)

// La clave del fondo si se dibuja con su color (para `data-color` y las pruebas); nula si va `auto`.
export const colorDelFondo = (
  estilo: EstiloDeLaCelda | undefined,
  colores: ReadonlyMap<string, string>,
): string | null => (hexDe(estilo?.fondo, colores) === null ? null : (estilo?.fondo ?? null))

// Cada lado con su grosor: el suyo, si no el de `todos`, si no ninguno.
function bordesDibujados(bordes: EstiloDeLaCelda['bordes']): BordesDibujados {
  const lado = (l: Lado) => GROSOR[bordes?.[l] ?? bordes?.todos ?? 'ninguno']
  return {
    arriba: lado('arriba'),
    derecha: lado('derecha'),
    abajo: lado('abajo'),
    izquierda: lado('izquierda'),
  }
}

// Lo que falta de la letra y la alineación, con su valor por omisión (D1).
const conOmision = (e: EstiloDeLaCelda) => ({ ...ESTILO_POR_OMISION, ...e })

export function estiloDibujado(
  estilo: EstiloDeLaCelda | undefined,
  colores: ReadonlyMap<string, string>,
): EstiloDibujado {
  const fondo = hexDe(estilo?.fondo, colores) ?? FONDO_AUTOMATICO
  const e = conOmision(estilo ?? {})
  return {
    fondo,
    texto: hexDe(estilo?.texto, colores) ?? textoAutomatico(fondo),
    negrita: e.negrita,
    cursiva: e.cursiva,
    tamano: e.tamano,
    alinear: e.alinear,
    alinearVertical: e.alinear_vertical,
    bordes: bordesDibujados(estilo?.bordes),
  }
}
