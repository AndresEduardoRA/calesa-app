import { describe, expect, it } from 'vitest'
import {
  camposSinLaCompraDirecta,
  columnaDeCompraDirecta,
  compraDirectaDeLaFila,
} from './compra-directa-de-la-fila'

const compra = { clave: 'bin_usd', activo: true, claveApibara: 'pricing.buy_now_usd' }
const puja = { clave: 'puja', activo: true, claveApibara: 'pricing.current_bid_usd' }
const color = { clave: 'color', activo: true, claveApibara: null }

describe('columnaDeCompraDirecta', () => {
  it('un origen manual no la tiene, aunque su layout traiga el campo', () => {
    expect(columnaDeCompraDirecta(false, [compra])).toEqual({ tipo: 'no_aplica' })
  })

  it('en subasta, el campo activo con la ruta de apibara, bajo la clave que tenga en ese layout', () => {
    expect(columnaDeCompraDirecta(true, [color, puja, compra])).toEqual({
      tipo: 'campo',
      clave: 'bin_usd',
    })
  })

  it('un campo inactivo, o uno que se llama compra_inmediata con otra ruta de apibara, no es la compra directa', () => {
    expect(columnaDeCompraDirecta(true, [{ ...compra, activo: false }])).toEqual({
      tipo: 'sin_campo',
    })
    expect(
      columnaDeCompraDirecta(true, [
        { clave: 'compra_inmediata', activo: true, claveApibara: 'pricing.otra' },
      ]),
    ).toEqual({ tipo: 'sin_campo' })
    expect(columnaDeCompraDirecta(true, [color])).toEqual({ tipo: 'sin_campo' })
  })
})

describe('compraDirectaDeLaFila', () => {
  const columna = { tipo: 'campo', clave: 'bin_usd' } as const

  it('un número, o un texto que es un número', () => {
    expect(compraDirectaDeLaFila({ bin_usd: 12500 }, columna)).toBe(12500)
    expect(compraDirectaDeLaFila({ bin_usd: '12500' }, columna)).toBe(12500)
  })

  it('vacío, nulo, texto que no es número o ausente: nulo («—»)', () => {
    expect(compraDirectaDeLaFila({ bin_usd: '' }, columna)).toBeNull()
    expect(compraDirectaDeLaFila({ bin_usd: null }, columna)).toBeNull()
    expect(compraDirectaDeLaFila({ bin_usd: 'abc' }, columna)).toBeNull()
    expect(compraDirectaDeLaFila({}, columna)).toBeNull()
  })

  it('sin campo o sin subasta no hay valor, aunque el atributo exista', () => {
    expect(compraDirectaDeLaFila({ bin_usd: 12500 }, { tipo: 'sin_campo' })).toBeNull()
    expect(compraDirectaDeLaFila({ bin_usd: 12500 }, { tipo: 'no_aplica' })).toBeNull()
  })
})

describe('camposSinLaCompraDirecta', () => {
  it('saca sólo ese campo; sin campo de compra directa quedan todos', () => {
    expect(
      camposSinLaCompraDirecta([color, compra, puja], { tipo: 'campo', clave: 'bin_usd' }),
    ).toEqual([color, puja])
    expect(camposSinLaCompraDirecta([color, compra], { tipo: 'sin_campo' })).toEqual([
      color,
      compra,
    ])
    expect(camposSinLaCompraDirecta([color], { tipo: 'no_aplica' })).toEqual([color])
  })
})
