// Por qué se rechazan los retoques de la tarjeta. El código es el contrato con `validar_retoques()` de la base (la regla en `detail`, el donde en `hint`) y con
// el juego `casos-de-retoques.json`; el mensaje es el mismo `format` de la base, con el id entre comillas latinas.

// En el orden fijo de la base: el primer rechazo manda.
export const REGLAS_DE_RETOQUES = [
  'forma',
  'demasiado_grande',
  'celda_inexistente',
  'celda_no_es_texto',
  'texto_largo',
  'fila_inexistente',
  'fila_repetida',
] as const

export type ReglaDeRetoques = (typeof REGLAS_DE_RETOQUES)[number]

export type RechazoDeRetoques = {
  readonly regla: ReglaDeRetoques
  // `retoques`, una clave de más, `celdas`, `celdas.<id>`, `filas_ocultas`, `filas_ocultas[i]` o `filas_ocultas.<id>`.
  readonly donde: string
  readonly mensaje: string
}

export const esReglaDeRetoques = (x: unknown): x is ReglaDeRetoques =>
  (REGLAS_DE_RETOQUES as readonly unknown[]).includes(x)

// `celdas.c_1` o `filas_ocultas.f_2` → el id.
const idDe = (donde: string) => donde.slice(donde.indexOf('.') + 1)

const MENSAJES: { readonly [R in ReglaDeRetoques]: (id: string) => string } = {
  forma: () => 'Los retoques no tienen la forma esperada.',
  demasiado_grande: () => 'Los retoques ocupan demasiado: acorta los textos o deja menos retoques.',
  celda_inexistente: (x) => `La celda «${x}» ya no está en la plantilla.`,
  celda_no_es_texto: (x) => `La celda «${x}» muestra un dato de la cotización: no se retoca.`,
  texto_largo: (x) => `El texto de la celda «${x}» tiene como máximo 300 caracteres.`,
  fila_inexistente: (x) => `La fila «${x}» ya no está en la plantilla.`,
  fila_repetida: (x) => `La fila «${x}» está dos veces.`,
}

export function rechazoDeRetoques(regla: ReglaDeRetoques, donde: string): RechazoDeRetoques {
  return { regla, donde, mensaje: MENSAJES[regla](idDe(donde)) }
}
