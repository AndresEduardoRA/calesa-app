import { describe, expect, it } from 'vitest'
import type { Formula } from '../formula'
import type { Nodo } from '../nodos'
import {
  bucketPara,
  MENSAJE_BUCKET_CON_MODOS,
  opcionesDeTipoDeCambio,
  sinBucketsSueltos,
  tipoDeCambioDelBucket,
} from './buckets'

const FORMULA: Formula = {
  definicion: {
    nodos: [
      { id: 'tca', tipo: 'tipo_cambio', etiqueta: 'TC A', clave: 'oficial' },
      { id: 'tcb', tipo: 'tipo_cambio', etiqueta: 'TC B', clave: 'paralelo' },
      { id: 'uno', tipo: 'constante', etiqueta: 'Uno', grupo: 'ga' },
    ] as Nodo[],
    buckets: { a: 'tca', otro: 'tca' },
    total_en: 'tca',
    grupos: [{ id: 'ga', etiqueta: 'Grupo A', tono: 'verde', bucket: 'otro' }],
  },
  params: { constantes: { uno: 1 }, tablas: {} },
}

describe('opcionesDeTipoDeCambio', () => {
  it('sin modos se elige cualquiera; con modos, sólo la que un bucket ya usa', () => {
    expect(opcionesDeTipoDeCambio(FORMULA, { conModos: false }).map((o) => o.motivo)).toEqual([
      null,
      null,
    ])
    expect(opcionesDeTipoDeCambio(FORMULA, { conModos: true })).toEqual([
      { id: 'tca', etiqueta: 'TC A', clave: 'oficial', buckets: ['a', 'otro'], motivo: null },
      {
        id: 'tcb',
        etiqueta: 'TC B',
        clave: 'paralelo',
        buckets: [],
        motivo: MENSAJE_BUCKET_CON_MODOS,
      },
    ])
  })
})

describe('bucketPara', () => {
  it('usa el bucket que ya tenía la banda, si apunta ahí; si no, el primero que apunta', () => {
    expect(bucketPara(FORMULA, 'tca', { conModos: true, preferido: 'otro' })).toMatchObject({
      ok: true,
      bucket: 'otro',
    })
    expect(bucketPara(FORMULA, 'tca', { conModos: true })).toMatchObject({ ok: true, bucket: 'a' })
  })

  it('sin modos crea uno con la clave del tipo de cambio, sin chocar', () => {
    expect(bucketPara(FORMULA, 'tcb', { conModos: false })).toEqual({
      ok: true,
      bucket: 'paralelo',
      buckets: { a: 'tca', otro: 'tca', paralelo: 'tcb' },
    })
    const conNodo = {
      ...FORMULA,
      definicion: {
        ...FORMULA.definicion,
        nodos: [
          ...FORMULA.definicion.nodos,
          { id: 'paralelo', tipo: 'input', etiqueta: 'P' } as Nodo,
        ],
      },
    }
    expect(bucketPara(conNodo, 'tcb', { conModos: false })).toMatchObject({ bucket: 'paralelo_2' })
  })

  it('con modos no crea; lo que no es un tipo de cambio no sirve', () => {
    expect(bucketPara(FORMULA, 'tcb', { conModos: true })).toEqual({
      ok: false,
      mensaje: MENSAJE_BUCKET_CON_MODOS,
    })
    expect(bucketPara(FORMULA, 'uno', { conModos: false }).ok).toBe(false)
  })
})

describe('tipoDeCambioDelBucket y sinBucketsSueltos', () => {
  it('lee el tipo de cambio de un bucket', () => {
    expect(tipoDeCambioDelBucket(FORMULA, 'otro')).toBe('tca')
    expect(tipoDeCambioDelBucket(FORMULA, 'nada')).toBeNull()
  })

  it('quita los buckets que no usa ningún grupo ni nodo, y nada más', () => {
    expect(sinBucketsSueltos(FORMULA.definicion).buckets).toEqual({ otro: 'tca' })
    const limpia = sinBucketsSueltos(FORMULA.definicion)
    expect(sinBucketsSueltos(limpia)).toBe(limpia)
  })
})
