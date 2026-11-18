// El juego espejo de los colores del catálogo: lo que `derivarColores()`, `tintaDeLaTarjeta()` y `contrasteDeLaTarjeta()` de
// `src/modules/cotizaciones/entities/colores.ts` dicen de cada hex, para que `_color_derivar()` y `_color_tinta_de_la_tarjeta()` de la base
// (`areas/diseno/colores.sql`) digan exactamente lo mismo. Los extremos, los de fábrica, unos 40 cerca de los umbrales de luminancia y el resto al azar.
import { CONTRASTE_AA, luminancia } from '@/shared/lib/color'
import {
  LUMINANCIA_DEL_FONDO_CLARO,
  LUMINANCIA_DEL_FONDO_OSCURO,
  contrasteDeLaTarjeta,
  derivarColores,
  tintaDeLaTarjeta,
  type ColoresDeUnTono,
} from '@/modules/cotizaciones/entities/colores'

export const SEMILLA = 20261117
export const MINIMO_DE_CASOS = 300

export type CasoDeColor = {
  hex: string
  colores: ColoresDeUnTono
  // Con la tinta clara derivada del mismo hex.
  tintaDeLaTarjeta: string
  avisoDeLaTarjeta: boolean
}

const hex = (r: number, g: number, b: number) =>
  `#${[r, g, b]
    .map((c) =>
      Math.min(255, Math.max(0, Math.round(c)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`

const grises = Array.from({ length: 17 }, (_, i) => Math.min(255, i * 16)).map((v) => hex(v, v, v))

export const EXTREMOS = [
  '#000000',
  '#ffffff',
  '#ffff00',
  '#ff0000',
  '#00ff00',
  '#0000ff',
  '#00ffff',
  '#ff00ff',
  ...grises,
  '#767676',
  '#777777',
  // Los fondos claros de fábrica (su hex al migrar) y los de los ejemplos de la pantalla.
  '#fff7d6',
  '#e6f6ee',
  '#ffe9d6',
  '#31869b',
  '#7048e8',
  '#fff2cc',
  '#1b2130',
  '#1d2330',
]

function generador(semilla: number) {
  let s = semilla >>> 0
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32
}

function caso(color: string): CasoDeColor {
  const colores = derivarColores(color)
  return {
    hex: color,
    colores,
    tintaDeLaTarjeta: tintaDeLaTarjeta(color, colores.claro.tinta),
    avisoDeLaTarjeta: contrasteDeLaTarjeta(color).aviso,
  }
}

export function generarCasos(): { semilla: number; aa: number; casos: CasoDeColor[] } {
  const hexes = new Set(EXTREMOS)
  const azar = generador(SEMILLA)
  const canal = () => azar() * 255
  // Unos 40 hex a menos de 0,01 de un umbral de luminancia (el del fondo claro y el del oscuro): ahí el primer paso decide.
  let cerca = 0
  for (let intento = 0; cerca < 40 && intento < 400000; intento++) {
    const umbral = intento % 2 === 0 ? LUMINANCIA_DEL_FONDO_CLARO : LUMINANCIA_DEL_FONDO_OSCURO
    const base = umbral === LUMINANCIA_DEL_FONDO_CLARO ? 231 : 62
    const c = hex(base + azar() * 24 - 12, base + azar() * 24 - 12, base + azar() * 24 - 12)
    if (!hexes.has(c) && Math.abs(luminancia(c) - umbral) < 0.01) {
      hexes.add(c)
      cerca++
    }
  }
  while (hexes.size < MINIMO_DE_CASOS) hexes.add(hex(canal(), canal(), canal()))
  return { semilla: SEMILLA, aa: CONTRASTE_AA, casos: [...hexes].map(caso) }
}

export const casosComoTexto = () => `${JSON.stringify(generarCasos(), null, 1)}\n`
