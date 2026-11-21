// Insertar y duplicar una fila de la planilla (D12), como en Excel; el id nunca se ve. Insertar pone una fila «Valor fijo» en 0 (`constante`, en dólares) con
// la etiqueta «Fila nueva» y la banda de la fila de referencia: «arriba» va antes de sus auxiliares, «abajo» después de ella. Duplicar copia el nodo con un id
// nuevo, debajo del original: si tiene texto lo recompila en su lugar nuevo, y si su B absorbe una pct la clona (`<nuevo>_pct`) y la sustituye en el texto.
// Puro, O(nodos).
import type { CatalogoDeTablas } from '../compilador'
import { T } from '../compilador-lexico'
import type { Formula } from '../formula'
import type { Nodo } from '../nodos'
import { compilarFila } from './compilar-fila'
import { idDeFilaNueva, MAXIMO_DE_LA_ETIQUETA, ocupadosDe } from './fila-nueva'
import { filaDe, hojaDeLaPlanilla, type HojaDeLaPlanilla } from './hoja-de-la-planilla'
import { tokensDe } from './referencias-a1'
import { textoVigente } from './texto-vigente'

export const ETIQUETA_DE_FILA_NUEVA = 'Fila nueva'

export type LadoDeInsertar = 'arriba' | 'abajo'
// `junto`: el número de la fila de referencia (nulo en una fórmula vacía: va al final).
export type PedidoDeInsertar = { readonly junto: number | null; readonly lado: LadoDeInsertar }

export type FilaInsertada = { readonly ok: true; readonly formula: Formula; readonly id: string }
export type ResultadoDeDuplicar = FilaInsertada | { readonly ok: false; readonly mensaje: string }

// El lugar de la lista donde va un nodo «arriba» (antes de las auxiliares) o «abajo» (después de la raíz) de la fila `numero`.
function lugarJunto(
  nodos: readonly Nodo[],
  hoja: HojaDeLaPlanilla,
  numero: number | null,
  lado: LadoDeInsertar,
): number {
  const f = numero === null ? undefined : filaDe(hoja, numero)
  if (f === undefined) return nodos.length
  const id = lado === 'arriba' ? (f.auxiliares[0] ?? f.id) : f.id
  const i = nodos.findIndex((n) => n.id === id)
  if (i === -1) return nodos.length
  return lado === 'arriba' ? i : i + 1
}

const conNodos = (
  formula: Formula,
  nodos: Nodo[],
  constantes: Record<string, number>,
): Formula => ({
  ...formula,
  definicion: { ...formula.definicion, nodos },
  params: { ...formula.params, constantes },
})

export function insertarFila(
  formula: Formula,
  pedido: PedidoDeInsertar,
  hoja: HojaDeLaPlanilla = hojaDeLaPlanilla(formula),
): FilaInsertada {
  const id = idDeFilaNueva(ETIQUETA_DE_FILA_NUEVA, ocupadosDe(formula))
  const grupo = pedido.junto === null ? null : (filaDe(hoja, pedido.junto)?.grupo ?? null)
  const nuevo = {
    id,
    tipo: 'constante',
    etiqueta: ETIQUETA_DE_FILA_NUEVA,
    formato: 'usd',
    ...(grupo === null ? {} : { grupo }),
  } as Nodo
  const nodos = [...formula.definicion.nodos]
  nodos.splice(lugarJunto(nodos, hoja, pedido.junto, pedido.lado), 0, nuevo)
  return {
    ok: true,
    formula: conNodos(formula, nodos, { ...formula.params.constantes, [id]: 0 }),
    id,
  }
}

// El texto con cada nombre `de` cambiado por `a` (sólo nombres enteros, no dentro de un texto entre comillas).
export function cambiarNombre(texto: string, de: string, a: string): string {
  let salida = ''
  let desde = 0
  for (const t of tokensDe(texto)) {
    if (t.t !== T.NOMBRE || texto.slice(t.desde, t.hasta) !== de) continue
    salida += texto.slice(desde, t.desde) + a
    desde = t.hasta
  }
  return salida + texto.slice(desde)
}

const sinSalida = (n: Nodo): Nodo => {
  const { salida: _salida, ...resto } = n as Nodo & { salida?: unknown }
  return resto as Nodo
}

type Copia = { formula: Formula; id: string; pct: { de: string; a: string } | null }

// La copia sin compilar: el nodo (y la pct absorbida, clonada) justo después del original, con sus valores.
function copiar(formula: Formula, hoja: HojaDeLaPlanilla, numero: number): Copia | null {
  const fila = filaDe(hoja, numero)
  if (fila === undefined) return null
  const ocupados = new Set(ocupadosDe(formula))
  const id = idDeFilaNueva(fila.nodo.etiqueta, ocupados)
  ocupados.add(id)
  const etiqueta = `${fila.nodo.etiqueta} (copia)`.slice(0, MAXIMO_DE_LA_ETIQUETA)
  const constantes = { ...formula.params.constantes }
  const valorDe = (de: string, a: string) => {
    const v = formula.params.constantes[de]
    if (v !== undefined) constantes[a] = v
  }
  const pctDe = fila.pctAbsorbida
  const pct = pctDe === null ? null : { de: pctDe, a: idDeFilaNueva(`${id}_pct`, ocupados) }
  const nodoPct = formula.definicion.nodos.find((n) => n.id === pctDe)
  const clones: Nodo[] = []
  if (pct !== null && nodoPct !== undefined) {
    clones.push({ ...nodoPct, id: pct.a } as Nodo)
    valorDe(pct.de, pct.a)
  }
  const copia = { ...sinSalida(fila.nodo), id, etiqueta } as Nodo & { pct?: string }
  if (pct !== null && copia.tipo === 'calculo' && copia.op === 'porcentaje_de') copia.pct = pct.a
  clones.push(copia)
  valorDe(fila.id, id)
  const nodos = [...formula.definicion.nodos]
  nodos.splice(lugarJunto(nodos, hoja, numero, 'abajo'), 0, ...clones)
  return { formula: conNodos(formula, nodos, constantes), id, pct }
}

export function duplicarFila(
  formula: Formula,
  numero: number,
  {
    tablas,
    hoja = hojaDeLaPlanilla(formula),
  }: { tablas?: CatalogoDeTablas; hoja?: HojaDeLaPlanilla } = {},
): ResultadoDeDuplicar {
  const fila = filaDe(hoja, numero)
  if (fila === undefined) return { ok: false, mensaje: 'Esa fila no existe.' }
  if (fila.nodo.tipo === 'opcion')
    return { ok: false, mensaje: `Esta fórmula ya tiene una variante (C${String(numero)}).` }
  const copia = copiar(formula, hoja, numero)
  if (copia === null) return { ok: false, mensaje: 'Esa fila no existe.' }
  const propio = 'texto' in fila.nodo ? fila.nodo.texto : undefined
  if (propio === undefined) return { ok: true, formula: copia.formula, id: copia.id }
  const vigente = textoVigente(formula, fila.id, { tablas })
  const guardado = vigente.estado === 'sin_texto' ? propio : vigente.texto
  const texto = copia.pct === null ? guardado : cambiarNombre(guardado, copia.pct.de, copia.pct.a)
  const r = compilarFila(copia.formula, {
    destino: { existente: copia.id },
    texto,
    confirmaPisar: true,
    ...(tablas === undefined ? {} : { tablas }),
  })
  if (!r.ok) return { ok: false, mensaje: r.error.mensaje }
  return { ok: true, formula: r.formula, id: copia.id }
}
