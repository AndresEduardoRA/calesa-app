// Los colores del catálogo de la empresa (nombre técnico heredado: la tabla `tonos`). Un color se define con su #hex: de él salen, solas, sus versiones de
// la hoja en claro y en oscuro (fondo, borde y tinta) con el contraste AA garantizado, y la tarjeta de la cotización lo pinta tal cual con el texto que se
// lea. Es el espejo de `_color_derivar()` y `_color_tinta_de_la_tarjeta()` de la base: las dos dan el mismo `#rrggbb` en minúsculas, y lo prueba el juego
// `supabase/tests/casos-de-colores.json` en Vitest y en `db:probar` (`supabase/tests/areas/diseno/colores.sql`). Vive en el núcleo porque lo usan tres
// áreas: el editor del catálogo (diseño), la vista previa de la plantilla y la tarjeta.
import { COLOR_SUPERFICIE_OSCURA, COLOR_TINTA } from '@/shared/config/app'
import { CONTRASTE_AA, contraste, luminancia, mezclar } from '@/shared/lib/color'

// Los topes y umbrales tienen su copia en la base (`_tonos_tope()`, las constantes de `_color_derivar()`): si cambian aquí, cambian allá.
export const TOPE_DE_COLORES = 48
// Hasta dónde se aclara el fondo del tema claro y se oscurece el del oscuro (luminancia relativa: 0 es negro, 1 es blanco).
export const LUMINANCIA_DEL_FONDO_CLARO = 0.8
export const LUMINANCIA_DEL_FONDO_OSCURO = 0.05
// Cada mezcla avanza de a 1/50 hacia su destino; en el paso 50 la mezcla es el destino mismo.
export const PASOS_DE_LA_DERIVACION = 50

const BLANCO = '#ffffff'
const NEGRO = '#000000'

export type ColoresDeUnTema = { fondo: string; borde: string; tinta: string }
export type ColoresDeUnTono = { claro: ColoresDeUnTema; oscuro: ColoresDeUnTema }

// La primera mezcla de `desde` hacia `hacia` que cumple `vale`. Si ninguna antes, la del último paso, que es `hacia`: cada destino se elige para que ahí
// siempre valga (el blanco tiene luminancia 1, la superficie oscura ≈ 0,016, y el negro o el blanco sobre esos fondos pasan de 10:1).
function primeraMezcla(desde: string, hacia: string, vale: (mezcla: string) => boolean): string {
  for (let paso = 0; paso < PASOS_DE_LA_DERIVACION; paso++) {
    const mezcla = mezclar(desde, hacia, paso / PASOS_DE_LA_DERIVACION)
    if (vale(mezcla)) return mezcla
  }
  return mezclar(desde, hacia, 1)
}

const cumpleAA = (uno: string, otro: string) => contraste(uno, otro) >= CONTRASTE_AA

// Las versiones de la hoja de un color: en claro, el fondo es el hex aclarado hasta un fondo claro (uno que ya lo es queda tal cual) y la tinta, el hex
// oscurecido hasta leerse sobre él; en oscuro, el fondo es el hex llevado hacia la superficie oscura de `design/tokens.css` y la tinta, el hex aclarado.
// El borde es el hex en los dos temas. Determinista y en minúsculas.
export function derivarColores(hex: string): ColoresDeUnTono {
  const base = hex.toLowerCase()
  const claroFondo = primeraMezcla(base, BLANCO, (m) => luminancia(m) >= LUMINANCIA_DEL_FONDO_CLARO)
  const claroTinta = primeraMezcla(base, NEGRO, (m) => cumpleAA(m, claroFondo))
  const oscuroFondo = primeraMezcla(
    base,
    COLOR_SUPERFICIE_OSCURA,
    (m) => luminancia(m) <= LUMINANCIA_DEL_FONDO_OSCURO,
  )
  const oscuroTinta = primeraMezcla(base, BLANCO, (m) => cumpleAA(m, oscuroFondo))
  return {
    claro: { fondo: claroFondo, borde: base, tinta: claroTinta },
    oscuro: { fondo: oscuroFondo, borde: base, tinta: oscuroTinta },
  }
}

// El texto de la tarjeta sobre el hex: la tinta clara del color si se lee ahí (AA); si no, la que más contraste dé entre la tinta oscura de la
// interfaz («negro») y el blanco. Un color migrado tiene de hex su fondo claro, así que su tarjeta sigue con la tinta de siempre.
export function tintaDeLaTarjeta(hex: string, tintaClara: string): string {
  if (cumpleAA(tintaClara, hex)) return tintaClara.toLowerCase()
  return contraste(COLOR_TINTA, hex) >= contraste(BLANCO, hex) ? COLOR_TINTA : BLANCO
}

// El texto `auto` de una celda de la tarjeta (la forma 2): la tinta oscura de la interfaz («negro», #1b2130) o el blanco, el de más contraste sobre el hex del
// fondo (o sobre el blanco si el fondo es `auto`). Lo usan los tres dibujos de la tarjeta: el HTML, el PDF y la imagen.
export function textoAutomatico(hexDelFondo: string): string {
  return contraste(COLOR_TINTA, hexDelFondo) >= contraste(BLANCO, hexDelFondo)
    ? COLOR_TINTA
    : BLANCO
}

// Fondo, borde y tinta de un grupo en la tarjeta (la vista previa y el PDF), iguales en los dos temas: la tarjeta es la imagen que recibe el cliente.
export function coloresDeLaTarjeta(color: {
  hex: string
  claro: Pick<ColoresDeUnTema, 'borde' | 'tinta'>
}): ColoresDeUnTema {
  return {
    fondo: color.hex.toLowerCase(),
    borde: color.claro.borde.toLowerCase(),
    tinta: tintaDeLaTarjeta(color.hex, color.claro.tinta),
  }
}

// La razón con un decimal, truncada y con coma (como el texto de la base): 3,24 se dice «3,2», nunca «3,3».
export function razonEnTexto(razon: number): string {
  const decimas = Math.floor(razon * 10)
  return `${String(Math.floor(decimas / 10))},${String(decimas % 10)}`
}

export type ContrasteDeLaTarjeta = {
  negro: number
  blanco: number
  // Ni el negro ni el blanco se leen sobre el hex (los dos < 4,5:1): un aviso suave, nunca un bloqueo.
  aviso: boolean
  textoNegro: string
  textoBlanco: string
}

// Cómo se lee el texto de la tarjeta sobre un hex, en negro (la tinta de la interfaz) y en blanco. Con negro puro el aviso no saldría nunca.
export function contrasteDeLaTarjeta(hex: string): ContrasteDeLaTarjeta {
  const negro = contraste(COLOR_TINTA, hex)
  const blanco = contraste(BLANCO, hex)
  return {
    negro,
    blanco,
    aviso: Math.max(negro, blanco) < CONTRASTE_AA,
    textoNegro: razonEnTexto(negro),
    textoBlanco: razonEnTexto(blanco),
  }
}
