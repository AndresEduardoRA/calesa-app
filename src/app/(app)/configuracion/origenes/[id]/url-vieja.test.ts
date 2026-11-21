import { describe, expect, it } from 'vitest'
import { destinoDeLaUrlVieja } from './url-vieja'

const ID = '00000000-0000-4000-8000-000000000001'
const BASE = `/configuracion/origenes/${ID}`

describe('destinoDeLaUrlVieja', () => {
  it('cada ?seccion= lleva a su pestaña', () => {
    for (const parte of ['datos', 'campos', 'categorias', 'flujo', 'formulas', 'tablas']) {
      expect(destinoDeLaUrlVieja(ID, { seccion: parte })).toBe(`${BASE}/${parte}`)
    }
  })

  it('?seccion=formula, la de antes, lleva a la lista de las fórmulas', () => {
    expect(destinoDeLaUrlVieja(ID, { seccion: 'formula', panel: 'nueva-formula' })).toBe(
      `${BASE}/formulas?panel=nueva-formula`,
    )
  })

  it('sin pestaña abre Datos; una sección desconocida, también', () => {
    expect(destinoDeLaUrlVieja(ID, {})).toBe(`${BASE}/datos`)
    expect(destinoDeLaUrlVieja(ID, { seccion: 'otra' })).toBe(`${BASE}/datos`)
  })

  it('un campo o una categoría abiertos sin ?seccion= llevan a su pestaña y se conservan', () => {
    expect(destinoDeLaUrlVieja(ID, { campo: 'nuevo' })).toBe(`${BASE}/campos?campo=nuevo`)
    expect(destinoDeLaUrlVieja(ID, { categoria: 'abc' })).toBe(`${BASE}/categorias?categoria=abc`)
  })

  it('el panel se conserva', () => {
    expect(destinoDeLaUrlVieja(ID, { panel: 'eliminar-origen' })).toBe(
      `${BASE}/datos?panel=eliminar-origen`,
    )
  })

  it('conserva toda la consulta menos seccion, en su orden', () => {
    expect(
      destinoDeLaUrlVieja(ID, {
        seccion: 'campos',
        campo: 'x',
        categoria: 'y',
        panel: 'z',
        otro: 'w',
      }),
    ).toBe(`${BASE}/campos?campo=x&categoria=y&panel=z&otro=w`)
  })

  it('el destino nunca es el origen sin pestaña', () => {
    for (const parametros of [{}, { seccion: 'x' }, { panel: 'nuevo' }, { campo: '' }]) {
      expect(destinoDeLaUrlVieja(ID, parametros)).toMatch(new RegExp(`^${BASE}/[a-z]+(\\?|$)`))
    }
  })
})
