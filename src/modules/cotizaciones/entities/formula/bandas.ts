// Las bandas de la planilla (los grupos de la fórmula; D13 y D14 del cambio de la planilla): sumar una banda (al final de `grupos`, con al menos una fila y, si
// la fórmula no lo tiene, el tipo de cambio del total), quitarla (sus filas quedan sin banda), poner o sacar una fila de una banda y el panel «Total y tipos
// de cambio» (`total_en`, la fila del total y el tipo de cambio de cada bucket). Lo que vale la fórmula entera (el doble conteo, una banda vacía) lo dice
// después `validarFormula()`, como tras aplicar una fila. Puro y nunca lanza.
import { T } from '../compilador-lexico'
import type { Formula } from '../formula'
import type { Nodo } from '../nodos'
import type { NombradoPorLaTarjeta } from '../tarjeta-en-vivo'
import { sinBucketsSueltos, type ConModos } from './buckets'
import { idDeFilaNueva, ocupadosDe } from './fila-nueva'
import { esTipoDeCambio, MENSAJE_SIN_TOTAL_EN } from './total-de-la-formula'
import { filasDe } from './filas'
import {
  grupoNuevo,
  MENSAJE_FILA_QUE_NO_SUMA,
  nodoConGrupo,
  puedeSumarAlGrupo,
  revisarCambiosDelGrupo,
  type CambiosDelGrupo,
  type ContextoDelGrupo,
  type ErrorDelGrupo,
  type FilaQueEntro,
} from './grupos'
import { hojaDeLaPlanilla } from './hoja-de-la-planilla'
import { tokensDe } from './referencias-a1'
import { listaDeCeldas } from './usos-de-la-fila'

export const MENSAJE_BANDA_QUE_NO_ESTA = 'Esa banda ya no está en la fórmula.'
const MENSAJE_SIN_FILAS = 'Elige al menos una fila que sume a la banda.'

type Resultado =
  | { readonly ok: true; readonly formula: Formula }
  | { readonly ok: false; readonly mensaje: string }

const conDefinicion = (formula: Formula, definicion: Formula['definicion']): Formula => ({
  ...formula,
  definicion,
})

const unicaDe = (formula: Formula, grupo: string) =>
  formula.definicion.nodos.filter((n) => n.grupo === grupo).length === 1

const mensajeDeUnica = (etiqueta: string) =>
  `Es la única fila de «${etiqueta}»: quita la banda o suma otra fila antes.`

// --- sumar una banda --------------------------------------------------------------------------------

// Lo de una banda nueva: lo de editar una y, si la fórmula no tiene `total_en`, el tipo de cambio del total (`grupos_sin_total_en`).
export type CambiosDeLaBanda = CambiosDelGrupo & { readonly totalEn?: string }

export type ResultadoDeCrearBanda =
  | { ok: true; formula: Formula; id: string; entraron: FilaQueEntro[] }
  | { ok: false; errores: ErrorDelGrupo[] }

function erroresDeLaBandaNueva(formula: Formula, cambios: CambiosDeLaBanda): ErrorDelGrupo[] {
  const errores: ErrorDelGrupo[] = []
  if (cambios.miembros.length === 0) errores.push({ campo: 'miembros', mensaje: MENSAJE_SIN_FILAS })
  if (formula.definicion.total_en === undefined && !esTipoDeCambio(formula, cambios.totalEn))
    errores.push({ campo: 'total_en', mensaje: MENSAJE_SIN_TOTAL_EN })
  return errores
}

export function crearBanda(
  formula: Formula,
  cambios: CambiosDeLaBanda,
  contexto: ContextoDelGrupo,
): ResultadoDeCrearBanda {
  const revision = revisarCambiosDelGrupo(formula, cambios, contexto)
  const errores = [...revision.errores, ...erroresDeLaBandaNueva(formula, cambios)]
  if (errores.length > 0 || revision.bucket === null) return { ok: false, errores }
  const grupos = formula.definicion.grupos ?? []
  const id = idDeFilaNueva(
    cambios.etiqueta.trim(),
    new Set([...ocupadosDe(formula), revision.bucket]),
  )
  const etiquetas = new Map(grupos.map((g) => [g.id, g.etiqueta]))
  const entran = new Set(cambios.miembros)
  const entraron: FilaQueEntro[] = []
  const nodos = formula.definicion.nodos.map((n) => {
    if (!entran.has(n.id)) return n
    entraron.push({
      id: n.id,
      etiqueta: n.etiqueta,
      desde: n.grupo === undefined ? null : (etiquetas.get(n.grupo) ?? n.grupo),
    })
    return nodoConGrupo(n, id)
  })
  const totalEn = formula.definicion.total_en ?? cambios.totalEn
  const definicion = {
    ...formula.definicion,
    nodos,
    buckets: revision.buckets,
    grupos: [...grupos, grupoNuevo(id, cambios, revision.bucket)],
    ...(totalEn === undefined ? {} : { total_en: totalEn }),
  }
  return {
    ok: true,
    formula: conDefinicion(formula, contexto.conModos ? definicion : sinBucketsSueltos(definicion)),
    id,
    entraron,
  }
}

// --- quitar una banda -------------------------------------------------------------------------------

const nombraEnElTexto = (texto: string, nombre: string) =>
  tokensDe(texto).some((t) => t.t === T.NOMBRE && texto.slice(t.desde, t.hasta) === nombre)

// Las filas cuyo texto nombra la banda (`SUMA(primer_pago)`), por número.
function filasQueNombranLaBanda(formula: Formula, grupo: string): number[] {
  const hoja = hojaDeLaPlanilla(formula)
  return hoja.filas
    .filter(
      (f) =>
        'texto' in f.nodo && f.nodo.texto !== undefined && nombraEnElTexto(f.nodo.texto, grupo),
    )
    .map((f) => f.numero)
}

function motivoParaNoQuitar(
  formula: Formula,
  grupo: string,
  tarjeta: NombradoPorLaTarjeta | null,
): string | null {
  if ((formula.definicion.grupos ?? []).length === 1)
    return 'Es la única banda: suma otra antes de quitarla.'
  const nombran = filasQueNombranLaBanda(formula, grupo)
  if (nombran.length > 0)
    return `${nombran.length === 1 ? 'La nombra' : 'La nombran'} ${listaDeCeldas(nombran)}: cambia su fórmula antes.`
  if (tarjeta === null) return 'No se pudo leer la tarjeta: recarga la página para quitar bandas.'
  if (tarjeta.grupos.includes(grupo)) return 'La usa la tarjeta: quítala en «Tarjeta» antes.'
  return null
}

export function quitarBanda(
  formula: Formula,
  grupoId: string,
  { tarjeta, conModos }: ConModos & { readonly tarjeta: NombradoPorLaTarjeta | null },
): Resultado {
  const grupos = formula.definicion.grupos ?? []
  if (!grupos.some((g) => g.id === grupoId))
    return { ok: false, mensaje: MENSAJE_BANDA_QUE_NO_ESTA }
  const motivo = motivoParaNoQuitar(formula, grupoId, tarjeta)
  if (motivo !== null) return { ok: false, mensaje: motivo }
  const definicion = {
    ...formula.definicion,
    nodos: formula.definicion.nodos.map((n) => (n.grupo === grupoId ? nodoConGrupo(n, null) : n)),
    grupos: grupos.filter((g) => g.id !== grupoId),
  }
  return {
    ok: true,
    formula: conDefinicion(formula, conModos ? definicion : sinBucketsSueltos(definicion)),
  }
}

// --- una fila en una banda ---------------------------------------------------------------------------

function motivoParaPonerEnBanda(formula: Formula, fila: Nodo, grupo: string | null): string | null {
  const grupos = formula.definicion.grupos ?? []
  if (grupo !== null && !grupos.some((g) => g.id === grupo)) return MENSAJE_BANDA_QUE_NO_ESTA
  if (grupo !== null && !puedeSumarAlGrupo(fila)) return MENSAJE_FILA_QUE_NO_SUMA
  if (fila.grupo === undefined || !unicaDe(formula, fila.grupo)) return null
  return mensajeDeUnica(grupos.find((g) => g.id === fila.grupo)?.etiqueta ?? fila.grupo)
}

// Pone la fila en la banda, o la saca con `null`. La única fila de una banda no sale (la banda quedaría vacía, `grupo_vacio`).
export function ponerEnBanda(formula: Formula, filaId: string, grupo: string | null): Resultado {
  const fila = filasDe(formula.definicion).find((f) => f.nodo.id === filaId)?.nodo
  if (fila === undefined) return { ok: false, mensaje: 'Esa fila no existe.' }
  if (fila.grupo === (grupo ?? undefined)) return { ok: true, formula }
  const motivo = motivoParaPonerEnBanda(formula, fila, grupo)
  if (motivo !== null) return { ok: false, mensaje: motivo }
  const nodos = formula.definicion.nodos.map((n) => (n.id === filaId ? nodoConGrupo(n, grupo) : n))
  return { ok: true, formula: { ...formula, definicion: { ...formula.definicion, nodos } } }
}
