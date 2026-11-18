import { describe, expect, it } from 'vitest'
import { destinoDeLaUrlVieja } from './url-vieja'

const ID = '00000000-0000-4000-8000-000000000001'
const BASE = `/configuracion/origenes/${ID}`

describe('destinoDeLaUrlVieja', () => {
  it('cada ?seccion= lleva a su parte', () => {
    expect(destinoDeLaUrlVieja(ID, { seccion: 'datos' })).toBe(`${BASE}/datos`)
    expect(destinoDeLaUrlVieja(ID, { seccion: 'campos' })).toBe(`${BASE}/campos`)
    expect(destinoDeLaUrlVieja(ID, { seccion: 'categorias' })).toBe(`${BASE}/categorias`)
  })

  it('sin parte abre Datos; una sección desconocida, también', () => {
    expect(destinoDeLaUrlVieja(ID, {})).toBe(`${BASE}/datos`)
    expect(destinoDeLaUrlVieja(ID, { seccion: 'otra' })).toBe(`${BASE}/datos`)
  })

  it('un campo o una categoría abiertos sin ?seccion= llevan a su parte y se conservan', () => {
    expect(destinoDeLaUrlVieja(ID, { campo: 'nuevo' })).toBe(`${BASE}/campos?campo=nuevo`)
    expect(destinoDeLaUrlVieja(ID, { categoria: 'abc' })).toBe(`${BASE}/categorias?categoria=abc`)
  })

  it('el panel de eliminar el origen se conserva en Datos', () => {
    expect(destinoDeLaUrlVieja(ID, { panel: 'eliminar-origen' })).toBe(
      `${BASE}/datos?panel=eliminar-origen`,
    )
  })

  it('conserva campo, categoría y panel, y nada más', () => {
    expect(
      destinoDeLaUrlVieja(ID, {
        seccion: 'campos',
        campo: 'x',
        categoria: 'y',
        panel: 'z',
        otro: 'no',
        origen: ID,
      }),
    ).toBe(`${BASE}/campos?campo=x&categoria=y&panel=z`)
    expect(destinoDeLaUrlVieja(ID, { seccion: ['campos', 'datos'], campo: ['a', 'b'] })).toBe(
      `${BASE}/campos?campo=a`,
    )
  })

  it('el destino nunca es el origen sin parte', () => {
    for (const parametros of [{}, { seccion: 'x' }, { panel: 'nuevo' }, { campo: '' }]) {
      expect(destinoDeLaUrlVieja(ID, parametros)).toMatch(
        new RegExp(`^${BASE}/(datos|campos|categorias)(\\?|$)`),
      )
    }
  })
})
