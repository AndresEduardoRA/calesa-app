import { describe, expect, it } from 'vitest'
import { tarjetaDesde } from './lectura-de-la-tarjeta'
import { crudaDeLaTarjeta } from './tarjeta.soporte'
import {
  calculoDeEjemplo,
  PORCENTAJE_DE_EJEMPLO,
  TIPO_DE_CAMBIO_DE_EJEMPLO,
} from './vista-previa-de-ejemplo'

describe('calculoDeEjemplo', () => {
  const t = tarjetaDesde(crudaDeLaTarjeta())
  if (t === null || t.estado !== 'lista') throw new Error('no se lee')

  it('(n mod 8 + 1) × 250 por fila con nodo, sin el total; el total es la suma de los miembros; todo aplica', () => {
    const c = calculoDeEjemplo(t)
    expect(c.valores.get('remate')).toBe(250)
    expect(c.valores.get('fees')).toBe(500)
    expect(c.valores.get('flete')).toBe(750)
    expect(c.valores.get('garantia')).toBe(1000)
    expect(c.totales.usd).toBe(250 + 500 + 750)
    expect([...(c.estados?.values() ?? [])].every((e) => e === 'activo')).toBe(true)
  })

  it('el pct, los tipos de cambio, la variante y el modo de ejemplo', () => {
    const c = calculoDeEjemplo(t)
    expect(c.valores.get('flete_pct')).toBe(PORCENTAJE_DE_EJEMPLO)
    expect(c.valores.get('tc_oficial')).toBe(TIPO_DE_CAMBIO_DE_EJEMPLO)
    expect(c.valores.get('tc_bcb')).toBe(TIPO_DE_CAMBIO_DE_EJEMPLO)
    expect(c.valores.get('variante')).toBe('gasolina')
  })
})
