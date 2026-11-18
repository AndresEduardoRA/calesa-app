// La forma de la plantilla en cuadrícula (la forma 2), espejo de `_plantilla_cuadricula_forma()`: la raíz, las columnas y las filas aquí, las celdas en
// `celdas-de-cuadricula.ts` y las reglas de la grilla que no miran la fórmula en `reglas-de-la-grilla.ts`, en ese orden. El primer rechazo manda y su `donde`
// es el de la base. Las claves se leen con `Object.hasOwn`/`Object.keys`: `constructor` y `__proto__` son claves posibles.
import {
  ALTO_DE_FILA,
  ANCHO_DE_COLUMNA,
  FORMA_DE_LA_CUADRICULA,
  OCULTAR_SI,
  TOPE_EN_BYTES_DE_LA_CUADRICULA,
  type PlantillaEnCuadricula,
} from '../cuadricula-de-la-tarjeta'
import { revisarCeldas } from './celdas-de-cuadricula'
import type { RechazoDePlantilla } from './motivos-de-plantilla'
import { bytesComoJsonb, compararComoC, comoJson, esObjetoJsonb } from '../json-de-la-base'
import {
  campo,
  conClaveDeMas,
  enLista,
  entreEnteros,
  esId,
  formaRota,
} from './campos-de-cuadricula'
import { revisarLaGrilla } from './reglas-de-la-grilla'

export type ResultadoDeCuadricula =
  { ok: true; plantilla: PlantillaEnCuadricula } | { ok: false; error: RechazoDePlantilla }

const CLAVES_DE_LA_RAIZ = new Set(['forma', 'columnas', 'filas', 'celdas'])
const CLAVES_DE_UNA_COLUMNA = new Set(['id', 'ancho'])
const CLAVES_DE_UNA_FILA = new Set(['id', 'alto', 'ocultar_si', 'nodo'])

function revisarColumnas(columnas: unknown): RechazoDePlantilla | null {
  if (!Array.isArray(columnas) || columnas.length === 0) return formaRota('columnas')
  for (const [i, c] of columnas.entries()) {
    const donde = `columnas[${String(i)}]`
    if (!esObjetoJsonb(c) || conClaveDeMas(c, CLAVES_DE_UNA_COLUMNA)) return formaRota(donde)
    if (!esId(campo(c, 'id'))) return formaRota(`${donde}.id`)
    if (!entreEnteros(campo(c, 'ancho'), ANCHO_DE_COLUMNA.minimo, ANCHO_DE_COLUMNA.maximo))
      return formaRota(`${donde}.ancho`)
  }
  return null
}

// El `nodo` va con `no_aplica` y `no_aplica_o_cero` y no va con `nunca` (aunque sea `null`: la base mira `?`, no el valor).
function revisarFilas(filas: unknown): RechazoDePlantilla | null {
  if (!Array.isArray(filas) || filas.length === 0) return formaRota('filas')
  for (const [i, f] of filas.entries()) {
    const donde = `filas[${String(i)}]`
    if (!esObjetoJsonb(f) || conClaveDeMas(f, CLAVES_DE_UNA_FILA)) return formaRota(donde)
    if (!esId(campo(f, 'id'))) return formaRota(`${donde}.id`)
    if (!entreEnteros(campo(f, 'alto'), ALTO_DE_FILA.minimo, ALTO_DE_FILA.maximo))
      return formaRota(`${donde}.alto`)
    const ocultar = campo(f, 'ocultar_si')
    if (!enLista(ocultar, OCULTAR_SI)) return formaRota(`${donde}.ocultar_si`)
    const conNodo = Object.hasOwn(f, 'nodo')
    if (ocultar === 'nunca' ? conNodo : !esId(campo(f, 'nodo'))) return formaRota(`${donde}.nodo`)
  }
  return null
}

function revisar(v: unknown, conTope: boolean): RechazoDePlantilla | null {
  if (!esObjetoJsonb(v)) return formaRota('definicion')
  if (conTope && bytesComoJsonb(v) > TOPE_EN_BYTES_DE_LA_CUADRICULA) return formaRota('definicion')
  const [deMas] = Object.keys(v)
    .filter((k) => !CLAVES_DE_LA_RAIZ.has(k))
    .sort(compararComoC)
  if (deMas !== undefined) return formaRota(deMas)
  if (campo(v, 'forma') !== FORMA_DE_LA_CUADRICULA) return formaRota('forma')
  return (
    revisarColumnas(campo(v, 'columnas')) ??
    revisarFilas(campo(v, 'filas')) ??
    revisarCeldas(campo(v, 'celdas'))
  )
}

// `conTope: false` es sólo para lo que sale de la conversión de la forma 1 (D12): ya lo acotan la forma 1 y la fórmula, y no se guarda.
export function formaDeCuadricula(
  entrada: unknown,
  { conTope }: { conTope: boolean } = { conTope: true },
): ResultadoDeCuadricula {
  const v = comoJson(entrada)
  const error = revisar(v, conTope)
  if (error !== null) return { ok: false, error }
  // Lo que pasó `revisar()` tiene la forma de `PlantillaEnCuadricula` (lo prueba el juego).
  const plantilla = v as PlantillaEnCuadricula
  const grilla = revisarLaGrilla(plantilla)
  return grilla === null ? { ok: true, plantilla } : { ok: false, error: grilla }
}
