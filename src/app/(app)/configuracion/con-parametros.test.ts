import { describe, expect, it } from 'vitest'
import { conParametros } from './con-parametros'

describe('conParametros', () => {
  it('quita `seccion` y conserva lo demás, en su orden', () => {
    expect(
      conParametros('/configuracion/x/y', { seccion: 'y', panel: 'nuevo', catalogo: 'tipo' }),
    ).toBe('/configuracion/x/y?panel=nuevo&catalogo=tipo')
  })

  it('sin parámetros que conservar, la ruta sola', () => {
    expect(conParametros('/configuracion/x/y', {})).toBe('/configuracion/x/y')
    expect(conParametros('/configuracion/x/y', { seccion: 'y', otro: undefined })).toBe(
      '/configuracion/x/y',
    )
  })

  it('un parámetro repetido se conserva repetido y se codifica', () => {
    expect(conParametros('/r', { a: ['1', '2'], b: 'á b' })).toBe('/r?a=1&a=2&b=%C3%A1+b')
  })
})
