// Por qué se rechaza una plantilla de la tarjeta. El código es el contrato con `validar_plantilla()` de la base (la regla en `detail`, el donde en `hint`) y
// con el juego `casos-de-plantilla.json`; el mensaje es el mismo `format` de la base, con el donde entre comillas latinas.
//
// Las dos formas comparten códigos. En la forma 2 (la cuadrícula) el `donde` de lo que no es `forma` lleva prefijo (`columnas.<id>`, `filas.<id>`,
// `celdas.<id>`) y el mensaje nombra la celda o la fila, nunca el nodo: así no expone el id de un nodo restringido.

// En el orden fijo de la base: el primer rechazo manda. La forma 1 usa `forma`, los cuatro de grupos y tono y los cuatro de nodos; la forma 2, `forma`, los
// diez de la grilla, `tono_inexistente` y los cinco de nodos (sin `grupo_*` ni `nodo_sin_lugar`).
export const REGLAS_DE_PLANTILLA = [
  'forma',
  'demasiadas_columnas',
  'demasiadas_filas',
  'demasiadas_celdas',
  'columna_repetida',
  'fila_repetida',
  'celda_repetida',
  'ancho_total',
  'celda_fuera_de_la_grilla',
  'celdas_se_pisan',
  'variable_inexistente',
  'grupo_inexistente',
  'grupo_repetido',
  'grupo_faltante',
  'tono_inexistente',
  'nodo_de_fila_inexistente',
  'nodo_inexistente',
  'mostrar_no_admitido',
  'nodo_sin_lugar',
  'nodo_restringido',
  'tipo_de_cambio_restringido',
] as const

export type ReglaDePlantilla = (typeof REGLAS_DE_PLANTILLA)[number]

export type RechazoDePlantilla = {
  readonly regla: ReglaDePlantilla
  readonly donde: string
  readonly mensaje: string
}

// `celdas.c_1` → «la celda «c_1»»; un donde sin prefijo (la forma 1) es nulo.
function enLaCuadricula(donde: string): string | null {
  const [prefijo, ...resto] = donde.split('.')
  const id = resto.join('.')
  if (prefijo === 'celdas') return `la celda «${id}»`
  if (prefijo === 'filas') return `la fila «${id}»`
  if (prefijo === 'columnas') return `la columna «${id}»`
  return null
}

// «la celda «c_1»» → «La celda «c_1»».
const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)

const repetida = (x: string) => `${mayuscula(enLaCuadricula(x) ?? `«${x}»`)} está dos veces.`

const MENSAJES: { readonly [R in ReglaDePlantilla]: (x: string) => string } = {
  forma: () => 'La plantilla no tiene la forma esperada.',
  demasiadas_columnas: () => 'La tarjeta lleva hasta 16 columnas.',
  demasiadas_filas: () => 'La tarjeta lleva hasta 120 filas.',
  demasiadas_celdas: () => 'La tarjeta lleva hasta 1.000 celdas.',
  columna_repetida: repetida,
  fila_repetida: repetida,
  celda_repetida: repetida,
  ancho_total: () => 'Las columnas suman más de 1.600 px de ancho.',
  celda_fuera_de_la_grilla: (x) => `${mayuscula(enLaCuadricula(x) ?? x)} se sale de la cuadrícula.`,
  celdas_se_pisan: (x) => `${mayuscula(enLaCuadricula(x) ?? x)} pisa otra celda.`,
  variable_inexistente: (x) =>
    `${mayuscula(enLaCuadricula(x) ?? x)} muestra un dato que no existe.`,
  grupo_inexistente: (x) => `El grupo «${x}» no es de la fórmula.`,
  grupo_repetido: (x) => `El grupo «${x}» está dos veces.`,
  grupo_faltante: (x) => `Falta el grupo «${x}»: la tarjeta lleva todos los grupos de la fórmula.`,
  tono_inexistente: (x) => {
    const lugar = enLaCuadricula(x)
    return lugar === null
      ? `El grupo «${x}» usa un color que no está en el catálogo.`
      : `${mayuscula(lugar)} usa un color que no está en el catálogo.`
  },
  nodo_de_fila_inexistente: (x) =>
    `${mayuscula(enLaCuadricula(x) ?? x)} depende de un nodo que no es de la fórmula.`,
  nodo_inexistente: (x) => {
    const lugar = enLaCuadricula(x)
    return lugar === null
      ? `La plantilla nombra «${x}», que no es un nodo de la fórmula.`
      : `${mayuscula(lugar)} nombra un nodo que no es de la fórmula.`
  },
  mostrar_no_admitido: (x) =>
    `${mayuscula(enLaCuadricula(x) ?? x)} muestra algo que su nodo no tiene.`,
  nodo_sin_lugar: (x) =>
    `El nodo «${x}» no va en la tarjeta: no es de un grupo, el total ni lo aparte.`,
  nodo_restringido: (x) => {
    const lugar = enLaCuadricula(x)
    return lugar === null
      ? `La tarjeta no puede mostrar «${x}»: no es del nivel «todos».`
      : `La tarjeta no puede mostrar lo que nombra ${lugar}: no es del nivel «todos».`
  },
  tipo_de_cambio_restringido: (x) => {
    const lugar = enLaCuadricula(x)
    return lugar === null
      ? `La tarjeta no puede nombrar el tipo de cambio de «${x}»: no es del nivel «todos».`
      : `La tarjeta no puede nombrar el tipo de cambio de ${lugar}: no es del nivel «todos».`
  },
}

export const rechazoDePlantilla = (regla: ReglaDePlantilla, donde: string): RechazoDePlantilla => ({
  regla,
  donde,
  mensaje: MENSAJES[regla](donde),
})
