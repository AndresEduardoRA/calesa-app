import { describe, expect, it } from 'vitest'
import type { Formula } from '../formula'
import type { Nodo } from '../nodos'
import {
  crearBanda,
  MENSAJE_BANDA_QUE_NO_ESTA,
  ponerEnBanda,
  quitarBanda,
  type CambiosDeLaBanda,
} from './bandas'
import { FORMULA_BANDAS as F, reglaQueFalla } from './bandas.soporte'
import { MENSAJE_BUCKET_CON_MODOS } from './buckets'
import { MENSAJE_FILA_QUE_NO_SUMA } from './grupos'

const CTX = { tonos: new Set(['verde', 'naranja', 'azul']), conModos: false }
const NUEVA: CambiosDeLaBanda = {
  etiqueta: 'Segundo pago',
  plazo: '',
  tono: 'azul',
  tipoDeCambio: 'tcb',
  miembros: ['suelta'],
}
const grupoDe = (f: Formula, id: string) => f.definicion.nodos.find((n) => n.id === id)?.grupo
const conNodos = (f: Formula, nodos: Nodo[]): Formula => ({
  ...f,
  definicion: { ...f.definicion, nodos: [...f.definicion.nodos, ...nodos] },
})

describe('crearBanda', () => {
  it('va al final de las bandas, con sus filas y el bucket que ya apunta a su tipo de cambio', () => {
    const r = crearBanda(F, NUEVA, CTX)
    if (!r.ok) throw new Error(JSON.stringify(r.errores))
    expect(r.id).toBe('segundo_pago')
    expect(r.formula.definicion.grupos?.at(-1)).toEqual({
      id: 'segundo_pago',
      etiqueta: 'Segundo pago',
      tono: 'azul',
      bucket: 'b',
    })
    expect(grupoDe(r.formula, 'suelta')).toBe('segundo_pago')
    expect(r.entraron).toEqual([{ id: 'suelta', etiqueta: 'Suelta', desde: null }])
    expect(reglaQueFalla(r.formula)).toBeNull()
  })

  it('el id no choca con una fila; una fila que viene de otra banda lo dice', () => {
    const r = crearBanda(F, { ...NUEVA, etiqueta: 'Cinco', miembros: ['cinco'] }, CTX)
    if (!r.ok) throw new Error(JSON.stringify(r.errores))
    expect(r.id).toBe('cinco_2')
    expect(r.entraron).toEqual([{ id: 'cinco', etiqueta: 'Cinco', desde: 'Grupo A' }])
  })

  it('sin filas, con un tipo de cambio ajeno o con modos y un bucket nuevo, no entra', () => {
    const campos = (c: Partial<CambiosDeLaBanda>, conModos = false) => {
      const r = crearBanda(F, { ...NUEVA, ...c }, { ...CTX, conModos })
      return r.ok ? [] : r.errores.map((e) => `${e.campo}: ${e.mensaje}`)
    }
    expect(campos({ miembros: [] })).toEqual([
      'miembros: Elige al menos una fila que sume a la banda.',
    ])
    expect(campos({ tipoDeCambio: 'cinco' })).toEqual([
      'tipo_de_cambio: Elige un tipo de cambio de la lista.',
    ])
    const sinB = { ...F, definicion: { ...F.definicion, buckets: { a: 'tca' } } }
    const r = crearBanda(sinB, NUEVA, { ...CTX, conModos: true })
    expect(r.ok ? [] : r.errores.map((e) => e.mensaje)).toEqual([MENSAJE_BUCKET_CON_MODOS])
  })

  it('una fórmula sin bandas pide el tipo de cambio del total', () => {
    const { grupos: _g, total_en: _t, buckets: _b, ...def } = F.definicion
    const nodos = def.nodos.map((n) => {
      const { grupo: _x, ...resto } = n
      return resto as Nodo
    })
    const sin: Formula = { ...F, definicion: { ...def, nodos } }
    const pide = crearBanda(sin, NUEVA, CTX)
    expect(pide.ok ? [] : pide.errores.map((e) => e.campo)).toEqual(['total_en'])
    const r = crearBanda(sin, { ...NUEVA, miembros: ['cinco'], totalEn: 'tca' }, CTX)
    if (!r.ok) throw new Error(JSON.stringify(r.errores))
    expect(r.formula.definicion.total_en).toBe('tca')
    expect(r.formula.definicion.buckets).toEqual({ paralelo: 'tcb' })
    expect(reglaQueFalla(r.formula)).toBeNull()
  })

  it('el doble conteo lo dice la validación de después', () => {
    const sub = {
      id: 'sub',
      tipo: 'calculo',
      op: 'suma',
      etiqueta: 'Sub',
      de: ['cinco', 'uno'],
    } as Nodo
    const r = crearBanda(conNodos(F, [sub]), { ...NUEVA, miembros: ['sub'] }, CTX)
    if (!r.ok) throw new Error(JSON.stringify(r.errores))
    expect(reglaQueFalla(r.formula)).toBe('doble_conteo')
  })
})

describe('quitarBanda', () => {
  const TARJETA = { nodos: [], grupos: [] }

  it('sus filas quedan sin banda y, sin modos, su bucket se limpia', () => {
    const r = quitarBanda(F, 'gb', { tarjeta: TARJETA, conModos: false })
    if (!r.ok) throw new Error(r.mensaje)
    expect(r.formula.definicion.grupos?.map((g) => g.id)).toEqual(['ga'])
    expect(grupoDe(r.formula, 'dos')).toBeUndefined()
    expect(r.formula.definicion.buckets).toEqual({ a: 'tca' })
    expect(reglaQueFalla(r.formula)).toBeNull()
    const conModos = quitarBanda(F, 'gb', { tarjeta: TARJETA, conModos: true })
    expect(conModos.ok && conModos.formula.definicion.buckets).toEqual({ a: 'tca', b: 'tcb' })
  })

  it('no se quita si la tarjeta la usa, si no se leyó, si es la única o si un texto la nombra', () => {
    const motivo = (f: Formula, tarjeta: { nodos: string[]; grupos: string[] } | null) => {
      const r = quitarBanda(f, 'gb', { tarjeta, conModos: false })
      return r.ok ? null : r.mensaje
    }
    expect(motivo(F, { nodos: [], grupos: ['gb'] })).toBe(
      'La usa la tarjeta: quítala en «Tarjeta» antes.',
    )
    expect(motivo(F, null)).toBe(
      'No se pudo leer la tarjeta: recarga la página para quitar bandas.',
    )
    const unica = { ...F, definicion: { ...F.definicion, grupos: F.definicion.grupos?.slice(1) } }
    expect(motivo(unica, TARJETA)).toBe('Es la única banda: suma otra antes de quitarla.')
    const nombra = {
      id: 'ver',
      tipo: 'calculo',
      op: 'suma',
      etiqueta: 'Ver',
      de: ['dos'],
      texto: '=SUMA(gb)',
    } as Nodo
    expect(motivo(conNodos(F, [nombra]), TARJETA)).toBe('La nombra C10: cambia su fórmula antes.')
    expect(quitarBanda(F, 'zz', { tarjeta: TARJETA, conModos: false })).toEqual({
      ok: false,
      mensaje: MENSAJE_BANDA_QUE_NO_ESTA,
    })
  })
})

describe('ponerEnBanda', () => {
  it('pone y saca una fila', () => {
    const r = ponerEnBanda(F, 'suelta', 'gb')
    if (!r.ok) throw new Error(r.mensaje)
    expect(grupoDe(r.formula, 'suelta')).toBe('gb')
    const fuera = ponerEnBanda(F, 'cinco', null)
    if (!fuera.ok) throw new Error(fuera.mensaje)
    expect(grupoDe(fuera.formula, 'cinco')).toBeUndefined()
    expect(reglaQueFalla(fuera.formula)).toBeNull()
    expect(ponerEnBanda(F, 'cinco', 'ga')).toEqual({ ok: true, formula: F })
  })

  it('la única fila de una banda no sale; lo que no suma no entra', () => {
    expect(ponerEnBanda(F, 'dos', 'ga')).toEqual({
      ok: false,
      mensaje: 'Es la única fila de «Grupo B»: quita la banda o suma otra fila antes.',
    })
    expect(ponerEnBanda(F, 'bandera', 'ga')).toEqual({
      ok: false,
      mensaje: MENSAJE_FILA_QUE_NO_SUMA,
    })
    expect(ponerEnBanda(F, 'suelta', 'zz')).toEqual({
      ok: false,
      mensaje: MENSAJE_BANDA_QUE_NO_ESTA,
    })
    expect(ponerEnBanda(F, 'nada', 'ga')).toEqual({ ok: false, mensaje: 'Esa fila no existe.' })
  })
})
