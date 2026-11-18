// Las celdas de la forma 2, espejo de la parte de `_plantilla_cuadricula_forma()` que las recorre: por celda, en este orden, la clave de más, `id`, `fila`,
// `columna`, `abarca_columnas` (1 a 16), `abarca_filas` (1 a 120), `contenido` según su `tipo` y `estilo`. Cada `donde` es su ruta con índice
// (`celdas[3].estilo.tamano`). Un texto no mezcla texto y variables: `{{` se rechaza.
import {
  ALINEAR,
  ALINEAR_VERTICAL,
  BORDES,
  MAXIMO_DE_CARACTERES_DE_UN_TEXTO,
  MAXIMO_DE_COLUMNAS,
  MAXIMO_DE_FILAS,
  MOSTRAR,
  TAMANOS_DE_LETRA,
} from '../cuadricula-de-la-tarjeta'
import type { RechazoDePlantilla } from './motivos-de-plantilla'
import { caracteres, esObjetoJsonb } from './json-de-la-base'
import {
  campo,
  conClaveDeMas,
  enLista,
  entreEnteros,
  esId,
  formaRota,
} from './campos-de-cuadricula'

type Objeto = Readonly<Record<string, unknown>>

const CLAVES_DE_UNA_CELDA = new Set([
  'id',
  'fila',
  'columna',
  'abarca_columnas',
  'abarca_filas',
  'contenido',
  'estilo',
])
const TIPOS = ['texto', 'dato', 'logo', 'vacio'] as const
const SOLO_EL_TIPO = new Set(['tipo'])
const DEL_TEXTO = new Set(['tipo', 'texto'])
const DE_LA_VARIABLE = new Set(['tipo', 'variable'])
const DEL_NODO = new Set(['tipo', 'nodo', 'mostrar'])
const CLAVES_DEL_ESTILO = new Set([
  'fondo',
  'texto',
  'negrita',
  'cursiva',
  'tamano',
  'alinear',
  'alinear_vertical',
  'bordes',
])
// En este orden se revisan los lados.
const LADOS_DE_LOS_BORDES = ['todos', 'arriba', 'derecha', 'abajo', 'izquierda'] as const

const textoAdmitido = (v: unknown) =>
  typeof v === 'string' && caracteres(v) <= MAXIMO_DE_CARACTERES_DE_UN_TEXTO && !v.includes('{{')

function revisarContenido(c: unknown, donde: string): RechazoDePlantilla | null {
  if (!esObjetoJsonb(c)) return formaRota(donde)
  const tipo = campo(c, 'tipo')
  if (!enLista(tipo, TIPOS)) return formaRota(`${donde}.tipo`)
  if (tipo === 'texto') {
    if (conClaveDeMas(c, DEL_TEXTO)) return formaRota(donde)
    return textoAdmitido(campo(c, 'texto')) ? null : formaRota(`${donde}.texto`)
  }
  if (tipo === 'dato') return revisarDato(c, donde)
  return conClaveDeMas(c, SOLO_EL_TIPO) ? formaRota(donde) : null
}

// Una variable (`{tipo, variable}`) o un nodo (`{tipo, nodo, mostrar}`): lo decide la clave `variable`. Que la variable exista es otra regla
// (`variable_inexistente`, después de la forma).
function revisarDato(c: Objeto, donde: string): RechazoDePlantilla | null {
  if (Object.hasOwn(c, 'variable')) {
    if (conClaveDeMas(c, DE_LA_VARIABLE)) return formaRota(donde)
    return esId(c['variable']) ? null : formaRota(`${donde}.variable`)
  }
  if (conClaveDeMas(c, DEL_NODO)) return formaRota(donde)
  if (!esId(campo(c, 'nodo'))) return formaRota(`${donde}.nodo`)
  return enLista(campo(c, 'mostrar'), MOSTRAR) ? null : formaRota(`${donde}.mostrar`)
}

function revisarBordes(b: unknown, donde: string): RechazoDePlantilla | null {
  if (!esObjetoJsonb(b) || conClaveDeMas(b, new Set(LADOS_DE_LOS_BORDES))) return formaRota(donde)
  const malo = LADOS_DE_LOS_BORDES.find((l) => Object.hasOwn(b, l) && !enLista(b[l], BORDES))
  return malo === undefined ? null : formaRota(`${donde}.${malo}`)
}

// Cada clave es opcional (D1); una presente, aunque sea `null`, tiene que valer.
function revisarEstilo(e: unknown, donde: string): RechazoDePlantilla | null {
  if (!esObjetoJsonb(e) || conClaveDeMas(e, CLAVES_DEL_ESTILO)) return formaRota(donde)
  const revisiones: [string, (v: unknown) => boolean][] = [
    ['fondo', esId],
    ['texto', esId],
    ['negrita', (v) => typeof v === 'boolean'],
    ['cursiva', (v) => typeof v === 'boolean'],
    ['tamano', (v) => typeof v === 'number' && enLista(v, TAMANOS_DE_LETRA)],
    ['alinear', (v) => enLista(v, ALINEAR)],
    ['alinear_vertical', (v) => enLista(v, ALINEAR_VERTICAL)],
  ]
  for (const [clave, vale] of revisiones) {
    if (Object.hasOwn(e, clave) && !vale(e[clave])) return formaRota(`${donde}.${clave}`)
  }
  return Object.hasOwn(e, 'bordes') ? revisarBordes(e['bordes'], `${donde}.bordes`) : null
}

function revisarCelda(c: unknown, donde: string): RechazoDePlantilla | null {
  if (!esObjetoJsonb(c) || conClaveDeMas(c, CLAVES_DE_UNA_CELDA)) return formaRota(donde)
  for (const clave of ['id', 'fila', 'columna']) {
    if (!esId(campo(c, clave))) return formaRota(`${donde}.${clave}`)
  }
  const abarcas = [
    ['abarca_columnas', MAXIMO_DE_COLUMNAS],
    ['abarca_filas', MAXIMO_DE_FILAS],
  ] as const
  for (const [clave, maximo] of abarcas) {
    if (Object.hasOwn(c, clave) && !entreEnteros(c[clave], 1, maximo))
      return formaRota(`${donde}.${clave}`)
  }
  const contenido = revisarContenido(campo(c, 'contenido'), `${donde}.contenido`)
  if (contenido !== null) return contenido
  return Object.hasOwn(c, 'estilo') ? revisarEstilo(c['estilo'], `${donde}.estilo`) : null
}

// Puede no haber celdas: una posición sin celda es una celda vacía sin estilo.
export function revisarCeldas(celdas: unknown): RechazoDePlantilla | null {
  if (!Array.isArray(celdas)) return formaRota('celdas')
  for (const [i, c] of celdas.entries()) {
    const rechazo = revisarCelda(c, `celdas[${String(i)}]`)
    if (rechazo !== null) return rechazo
  }
  return null
}
