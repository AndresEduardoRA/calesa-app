// La rejilla de la hoja (docs/GLOSARIO.md › «Rejilla de la hoja»): 12 columnas en cada sección (para sus ítems) y 12 para las secciones. Una pieza
// de N columnas toma su ancho cuando le tocan al menos 16 rem; si no, ocupa la fila entera. Como los cortes van en rem, al 200 % la rejilla colapsa
// sola. Puro y sin Zod (la hoja lo lleva al navegador sin el esquema del diseño): las clases que lo dibujan son las de
// `features/hoja/components/clases-de-la-rejilla.ts`.
import type { AnchoDeCelda } from './diseno'

// Las columnas de cada rejilla y las filas que puede ocupar una pieza (sin `alto`, las que pida su contenido). `diseno.ts` las valida.
export const COLUMNAS_DE_LA_REJILLA = 12
export const MAXIMO_DE_FILAS = 4

// Los anchos con nombre de los diseños guardados, en columnas.
export const COLUMNAS_DE_CADA_ANCHO = { completo: 12, mitad: 6, tercio: 4 } as const

export const columnasDeLaCelda = (ancho: AnchoDeCelda): number =>
  typeof ancho === 'number' ? ancho : COLUMNAS_DE_CADA_ANCHO[ancho]

// Lo mínimo que una pieza que no ocupa la fila entera tiene que medir.
export const ANCHO_MINIMO_DE_UNA_PIEZA = 16

// Los cortes de contenedor de Tailwind desde el primero que deja dos piezas lado a lado, en rem.
export const CORTES = {
  lg: 32,
  xl: 36,
  '2xl': 42,
  '3xl': 48,
  '4xl': 56,
  '5xl': 64,
  '6xl': 72,
  '7xl': 80,
} as const
export type Corte = keyof typeof CORTES
const ORDEN_DE_LOS_CORTES = Object.keys(CORTES) as Corte[]

// Desde qué corte una pieza de N columnas toma su ancho: el primero en que N/12 del contenedor mide 16 rem o más (12 → siempre; 6 a 11 → `lg`; 5 →
// `2xl`; 4 → `3xl`; 3 → `5xl`); 1 y 2 nunca llegan y van desde el último (`7xl`).
export function corteDe(columnas: number): Corte | 'siempre' {
  if (columnas >= COLUMNAS_DE_LA_REJILLA) return 'siempre'
  const alcanza = ORDEN_DE_LOS_CORTES.find(
    (c) => (CORTES[c] * columnas) / COLUMNAS_DE_LA_REJILLA >= ANCHO_MINIMO_DE_UNA_PIEZA,
  )
  return alcanza ?? '7xl'
}

// Una pieza que ocupa toda su fila no tiene al lado con qué compartir filas: su alto no cambia nada.
export const altoSirve = (columnas: number): boolean => columnas < COLUMNAS_DE_LA_REJILLA

// Una sección sin ancho es «Automática»: la mitad desde que el contenedor de las secciones mide 64 rem (lo de siempre), si no la fila entera.
export const SECCION_AUTOMATICA = { columnas: 6, corte: '5xl' } as const
