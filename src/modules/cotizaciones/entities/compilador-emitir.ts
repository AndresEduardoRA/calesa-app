// De un árbol a nodos del grafo (docs/COTIZADOR.md › «Fórmulas como texto»). Una pasada en post-orden con pila explícita:
// los hijos de izquierda a derecha y después el padre. Cada operación anidada y cada número escrito es un nodo auxiliar
// `<destino>__<n>`, con `n` desde 1 en ese orden; la raíz es la fila que se compila y no se numera. Un nombre no crea nodo.
import {
  argumentoInvalido,
  error,
  type Arbol,
  type Calculo,
  type ErrorCrudo,
  type Numero,
  type OpDeArbol,
} from './compilador-arbol'
import type { Nombres } from './compilador-nombres'
import { esta, type Medidor } from './medidor'
import { OPS_DE_CONDICION, type Nodo, type NodoCalculo } from './nodos'

export type Emitido = {
  nodos: Nodo[]
  params: Record<string, number>
  // El tramo del texto de cada nodo que se emitió, por id (todavía sin línea ni columna).
  rangos: Map<string, { desde: number; hasta: number }>
}

type Comunes = Partial<
  Pick<NodoCalculo, 'formato' | 'descripcion' | 'grupo' | 'salida' | 'bucket' | 'solo_en'>
>

const ANCHO_DE_ETIQUETA = 80
const LECTURA_DE_ETIQUETA = 100

// El fragmento del texto con los espacios juntos, a lo sumo 80 caracteres.
function etiquetaDe(texto: string, desde: number, hasta: number, m: Medidor): string {
  const trozo = texto.slice(desde, Math.min(hasta, desde + LECTURA_DE_ETIQUETA))
  let s = ''
  let espacio = false
  for (let i = 0; i < trozo.length; i += 1) {
    m.visitas += 1
    const c = trozo.charCodeAt(i)
    if (c === 32 || c === 9 || c === 10 || c === 13 || c === 160) espacio = true
    else {
      if (espacio) s += ' '
      espacio = false
      s += trozo.charAt(i)
    }
  }
  const largo = s.length > ANCHO_DE_ETIQUETA || hasta - desde > LECTURA_DE_ETIQUETA
  return largo ? `${s.slice(0, ANCHO_DE_ETIQUETA - 1)}…` : s || '·'
}

// El id del auxiliar n: si no cabe en 41, se recorta el prefijo.
function idAuxiliar(destino: string, n: number): string {
  const sufijo = `__${String(n)}`
  return destino.slice(0, 41 - sufijo.length) + sufijo
}

function comunesDe(d: Nombres['destino']): Comunes {
  const c: Comunes = {}
  if (d.formato !== undefined) c.formato = d.formato
  if (d.descripcion !== undefined) c.descripcion = d.descripcion
  if (d.grupo !== undefined) c.grupo = d.grupo
  if (d.salida !== undefined) c.salida = d.salida
  if (d.bucket !== undefined) c.bucket = d.bucket
  if (d.solo_en !== undefined) c.solo_en = d.solo_en
  return c
}

type Datos = {
  id: string
  a: Calculo
  de: string[]
  pct: string | undefined
  etiqueta: string
  comunes: Comunes
}

type Base = { id: string; tipo: 'calculo'; etiqueta: string } & Comunes
type Armador = (base: Base, d: Datos) => Nodo

const variadica =
  (op: 'suma' | 'restar' | 'multiplicar' | 'y' | 'o' | 'max' | 'min'): Armador =>
  (base, { de }) => ({ ...base, op, de })
const primero = (d: Datos) => d.de[0] ?? ''

// El nodo de cada operación. La condición de `elegir` es su primer hijo.
const ARMAR: Readonly<Record<OpDeArbol, Armador>> = {
  suma: variadica('suma'),
  restar: variadica('restar'),
  multiplicar: variadica('multiplicar'),
  y: variadica('y'),
  o: variadica('o'),
  max: variadica('max'),
  min: variadica('min'),
  dividir: (base, d) => ({ ...base, op: 'dividir', de: [primero(d), d.de[1] ?? ''] }),
  porcentaje_de: (base, d) => ({ ...base, op: 'porcentaje_de', de: d.de, pct: d.pct ?? '' }),
  si: (base, d) => ({ ...base, op: 'si', de: [primero(d)], condicion: d.a.campos.condicion ?? '' }),
  redondear: (base, d) => ({ ...base, op: 'redondear', de: [primero(d)], n: d.a.campos.n ?? 0 }),
  comparar: (base, d) => ({
    ...base,
    op: 'comparar',
    de: [primero(d), d.de[1] ?? ''],
    cmp: d.a.campos.cmp ?? '=',
  }),
  es_opcion: (base, d) => ({
    ...base,
    op: 'es_opcion',
    de: [primero(d)],
    cmp: d.a.campos.cmp === '<>' ? '<>' : '=',
    clave: d.a.campos.clave ?? '',
  }),
  elegir: (base, d) => ({ ...base, op: 'elegir', de: d.de.slice(1), prueba: primero(d) }),
  depreciar: (base, d) => ({
    ...base,
    op: 'depreciar',
    de: [primero(d)],
    tabla: d.a.campos.tabla ?? '',
    sobre: d.a.campos.sobre ?? '',
    columna: d.a.campos.columna ?? '',
  }),
}

const nodoDeCalculo = (d: Datos): Nodo =>
  ARMAR[d.a.op]({ id: d.id, tipo: 'calculo', etiqueta: d.etiqueta, ...d.comunes }, d)

type Marca = { a: Arbol; i: number }

type Emision = {
  texto: string
  raiz: Arbol
  nombres: Nombres
  comunes: Comunes
  salida: Emitido
  ids: string[]
  n: number
}

// El próximo hijo por visitar: los términos y, al final, el pct.
function hijoPendiente(marca: Marca): Arbol | undefined {
  const a = marca.a
  if (a.k !== 'calc') return undefined
  const hijo =
    marca.i < a.hijos.length ? a.hijos[marca.i] : marca.i === a.hijos.length ? a.pct : undefined
  if (hijo !== undefined) marca.i += 1
  return hijo
}

// El id del nodo que nace de `a`: el de la fila si es la raíz, o el auxiliar que toca.
function nuevoId(em: Emision, a: Arbol): string | ErrorCrudo {
  if (a === em.raiz) return em.nombres.destino.id
  em.n += 1
  const id = idAuxiliar(em.nombres.destino.id, em.n)
  const ocupado = esta(em.nombres.ocupados, id, em.nombres.m)
  return ocupado ? error('auxiliar_ocupado', a.desde, a.hasta, { nombre: id }) : id
}

function emitirNumero(em: Emision, a: Numero, id: string, etiqueta: string) {
  const esRaiz = a === em.raiz
  em.salida.params[id] = a.valor
  const formato = esRaiz
    ? (em.nombres.destino.formato ?? (a.pct ? 'pct' : undefined))
    : a.pct || a.comoPct
      ? 'pct'
      : 'raw'
  em.salida.nodos.push({
    id,
    tipo: 'constante',
    etiqueta,
    ...(esRaiz ? em.comunes : {}),
    ...(formato === undefined ? {} : { formato }),
  })
}

const DE_CONDICION = new Set<string>(OPS_DE_CONDICION)

// Una comparación, Y u O vale 1 o 0: su auxiliar es `raw`, y la raíz también si la fila no trae formato (una fila nueva).
function comunesDeCalculo(em: Emision, a: Calculo): Comunes {
  const raiz = a === em.raiz
  const condicion = DE_CONDICION.has(a.op)
  if (!condicion) return raiz ? em.comunes : {}
  return raiz ? { ...em.comunes, formato: em.comunes.formato ?? 'raw' } : { formato: 'raw' }
}

function emitirCalculo(em: Emision, a: Calculo, id: string, etiqueta: string) {
  const pct = a.pct === undefined ? undefined : em.ids.pop()
  const de = em.ids.splice(em.ids.length - a.hijos.length, a.hijos.length)
  const comunes = comunesDeCalculo(em, a)
  em.salida.nodos.push(nodoDeCalculo({ id, a, de, pct, etiqueta, comunes }))
}

// Un nodo ya con todos sus hijos emitidos.
function emitirUno(em: Emision, a: Numero | Calculo): ErrorCrudo | undefined {
  const id = nuevoId(em, a)
  if (typeof id !== 'string') return id
  em.salida.rangos.set(id, { desde: a.desde, hasta: a.hasta })
  const m = em.nombres.m
  const etiqueta =
    a === em.raiz ? em.nombres.destino.etiqueta : etiquetaDe(em.texto, a.desde, a.hasta, m)
  if (a.k === 'num') emitirNumero(em, a, id, etiqueta)
  else emitirCalculo(em, a, id, etiqueta)
  em.ids.push(id)
  return undefined
}

// Un nombre solo es la suma de uno: la fila lo lee.
function emitirNombreSolo(em: Emision, raiz: Arbol) {
  if (raiz.k !== 'ref') return
  const id = em.nombres.destino.id
  em.salida.rangos.set(id, { desde: raiz.desde, hasta: raiz.hasta })
  const a: Calculo = {
    k: 'calc',
    op: 'suma',
    hijos: [raiz],
    campos: {},
    deFuncion: false,
    paren: false,
    desde: raiz.desde,
    hasta: raiz.hasta,
  }
  const etiqueta = em.nombres.destino.etiqueta
  em.salida.nodos.push(
    nodoDeCalculo({ id, a, de: [raiz.nodo.id], pct: undefined, etiqueta, comunes: em.comunes }),
  )
}

export function emitir(texto: string, raiz: Arbol, nombres: Nombres): Emitido | ErrorCrudo {
  const em: Emision = {
    texto,
    raiz,
    nombres,
    comunes: comunesDe(nombres.destino),
    salida: { nodos: [], params: {}, rangos: new Map() },
    ids: [],
    n: 0,
  }
  const pila: Marca[] = [{ a: raiz, i: 0 }]
  for (;;) {
    const marca = pila[pila.length - 1]
    if (marca === undefined) break
    nombres.m.visitas += 1
    const hijo = hijoPendiente(marca)
    if (hijo !== undefined) {
      pila.push({ a: hijo, i: 0 })
      continue
    }
    pila.pop()
    const a = marca.a
    if (a.k === 'clave') return argumentoInvalido(a)
    if (a.k === 'texto') return error('texto_fuera_de_lugar', a.desde, a.hasta)
    if (a.k === 'ref') {
      em.ids.push(a.nodo.id)
      continue
    }
    const r = emitirUno(em, a)
    if (r !== undefined) return r
  }
  emitirNombreSolo(em, raiz)
  return em.salida
}
