// Los retoques de la tarjeta validados como los valida la base: espejo de `validar_retoques()`, con el juego común `casos-de-retoques.json`. Es una ayuda antes
// de enviar: la base vuelve a validar contra la plantilla publicada de hoy. Mismo orden, misma regla, mismo `donde` y el mismo mensaje; nunca lanza. Los textos
// se cuentan en code points (`char_length`), las claves van en orden C, los bytes son los del texto del `jsonb` y todo se busca con `Object.hasOwn` o `Map`:
// «constructor» es un id legal y un objeto lo encontraría en su prototipo.
import {
  MAXIMO_DE_CARACTERES_DE_UN_RETOQUE,
  TOPE_EN_BYTES_DE_LOS_RETOQUES,
  type PlantillaEnCuadricula,
  type RetoquesDeLaTarjeta,
} from '../../cuadricula-de-la-tarjeta'
import {
  bytesComoJsonb,
  caracteres,
  clavesEnOrdenC,
  comoJson,
  esObjetoJsonb,
  tipoJsonb,
} from '../../json-de-la-base'
import {
  rechazoDeRetoques,
  type RechazoDeRetoques,
  type ReglaDeRetoques,
} from './motivos-de-retoques'

export type ResultadoDeRetoques =
  { ok: true; retoques: RetoquesDeLaTarjeta } | { ok: false; error: RechazoDeRetoques }

const no = (regla: ReglaDeRetoques, donde: string): ResultadoDeRetoques => ({
  ok: false,
  error: rechazoDeRetoques(regla, donde),
})

// La forma de arriba: un objeto de hasta 24 KiB, sin claves de más, con `celdas` objeto si está.
function revisarLaForma(v: unknown): ResultadoDeRetoques | null {
  if (!esObjetoJsonb(v)) return no('forma', 'retoques')
  if (bytesComoJsonb(v) > TOPE_EN_BYTES_DE_LOS_RETOQUES) return no('demasiado_grande', 'retoques')
  const deMas = clavesEnOrdenC(v).find((k) => k !== 'celdas' && k !== 'filas_ocultas')
  if (deMas !== undefined) return no('forma', deMas)
  if (Object.hasOwn(v, 'celdas') && !esObjetoJsonb(v['celdas'])) return no('forma', 'celdas')
  return null
}

// Cada celda en orden C: un texto, de una celda de texto que está, de hasta 300 caracteres.
function revisarLasCeldas(
  celdas: Readonly<Record<string, unknown>>,
  tipos: ReadonlyMap<string, string>,
): { rechazo: ResultadoDeRetoques } | { celdas: Record<string, string> } {
  const pares: [string, string][] = []
  for (const id of clavesEnOrdenC(celdas)) {
    const donde = `celdas.${id}`
    const texto = celdas[id]
    if (typeof texto !== 'string') return { rechazo: no('forma', donde) }
    const tipo = tipos.get(id)
    if (tipo === undefined) return { rechazo: no('celda_inexistente', donde) }
    if (tipo !== 'texto') return { rechazo: no('celda_no_es_texto', donde) }
    if (caracteres(texto) > MAXIMO_DE_CARACTERES_DE_UN_RETOQUE) {
      return { rechazo: no('texto_largo', donde) }
    }
    pares.push([id, texto])
  }
  return { celdas: Object.fromEntries(pares) }
}

// Cada fila oculta en su orden: un id de una fila que está, una vez.
function revisarLasFilas(
  v: Readonly<Record<string, unknown>>,
  filas: ReadonlySet<string>,
): ResultadoDeRetoques | string[] {
  if (!Object.hasOwn(v, 'filas_ocultas')) return []
  const lista = v['filas_ocultas']
  if (!Array.isArray(lista)) return no('forma', 'filas_ocultas')
  const vistas = new Set<string>()
  for (const [i, id] of lista.entries()) {
    if (tipoJsonb(id) !== 'string') return no('forma', `filas_ocultas[${String(i)}]`)
    const fila = id as string
    if (!filas.has(fila)) return no('fila_inexistente', `filas_ocultas.${fila}`)
    if (vistas.has(fila)) return no('fila_repetida', `filas_ocultas.${fila}`)
    vistas.add(fila)
  }
  return [...vistas]
}

// `plantilla`: la cuadrícula contra la que valen (la que se dibuja); nula, ninguna: toda celda y toda fila es inexistente.
export function validarRetoques(
  entrada: unknown,
  plantilla: PlantillaEnCuadricula | null,
): ResultadoDeRetoques {
  const v = comoJson(entrada)
  const forma = revisarLaForma(v)
  if (forma !== null) return forma
  const raiz = v as Readonly<Record<string, unknown>>
  const tipos = new Map((plantilla?.celdas ?? []).map((c) => [c.id, c.contenido.tipo]))
  const celdas = revisarLasCeldas(
    Object.hasOwn(raiz, 'celdas') ? (raiz['celdas'] as Readonly<Record<string, unknown>>) : {},
    tipos,
  )
  if ('rechazo' in celdas) return celdas.rechazo
  const filas = revisarLasFilas(raiz, new Set((plantilla?.filas ?? []).map((f) => f.id)))
  if (!Array.isArray(filas)) return filas
  return {
    ok: true,
    retoques: {
      ...(Object.hasOwn(raiz, 'celdas') ? { celdas: celdas.celdas } : {}),
      ...(Object.hasOwn(raiz, 'filas_ocultas') ? { filas_ocultas: filas } : {}),
    },
  }
}
