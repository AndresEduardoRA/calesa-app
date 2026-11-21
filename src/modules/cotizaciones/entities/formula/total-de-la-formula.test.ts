import { describe, expect, it } from 'vitest'
import { FORMULA_BANDAS as F, reglaQueFalla } from './bandas.soporte'
import { cambiarTotal, esTipoDeCambio, filasQuePuedenSerElTotal } from './total-de-la-formula'

const errores = (r: ReturnType<typeof cambiarTotal>) =>
  r.ok
    ? []
    : r.errores.map(
        (e) => `${e.campo}${e.bucket === undefined ? '' : `.${e.bucket}`}: ${e.mensaje}`,
      )

describe('cambiarTotal', () => {
  it('cambia el tipo de cambio del total y el de un bucket', () => {
    const r = cambiarTotal(F, { totalEn: 'tcb', buckets: { a: 'tcb' } })
    if (!r.ok) throw new Error(JSON.stringify(r.errores))
    expect(r.formula.definicion.total_en).toBe('tcb')
    expect(r.formula.definicion.buckets).toEqual({ a: 'tcb', b: 'tcb' })
    expect(reglaQueFalla(r.formula)).toBeNull()
  })

  it('la fila del total pasa a otra y la de antes deja de serlo (un solo total)', () => {
    const r = cambiarTotal(F, { filaDelTotal: 'suelta' })
    if (!r.ok) throw new Error(JSON.stringify(r.errores))
    const salidas = r.formula.definicion.nodos.filter((n) => n.salida === 'total').map((n) => n.id)
    expect(salidas).toEqual(['suelta'])
    expect(reglaQueFalla(r.formula)).toBeNull()
  })

  it('rechaza lo que no sirve, campo por campo', () => {
    expect(errores(cambiarTotal(F, { totalEn: 'cinco' }))).toEqual([
      'total_en: Elige el tipo de cambio del total.',
    ])
    expect(errores(cambiarTotal(F, { filaDelTotal: 'cinco' }))).toEqual([
      'fila_del_total: Esa fila suma a «Grupo A»: sácala de la banda antes.',
    ])
    expect(errores(cambiarTotal(F, { filaDelTotal: 'bandera' }))).toEqual([
      'fila_del_total: El total tiene que ser un monto en dólares o en moneda.',
    ])
    expect(errores(cambiarTotal(F, { filaDelTotal: 'nada' }))).toEqual([
      'fila_del_total: Esa fila no existe.',
    ])
    expect(errores(cambiarTotal(F, { buckets: { c: 'tca', a: 'uno' } }))).toEqual([
      'buckets.c: Ese tipo de cambio ya no está en la fórmula.',
      'buckets.a: Elige un tipo de cambio de la lista.',
    ])
  })
})

describe('filasQuePuedenSerElTotal y esTipoDeCambio', () => {
  it('un monto sin banda ni otra salida; un tipo de cambio es una fila de ese tipo', () => {
    expect(filasQuePuedenSerElTotal(F).map((n) => n.id)).toEqual(['suelta', 'total'])
    expect(esTipoDeCambio(F, 'tca')).toBe(true)
    expect(esTipoDeCambio(F, 'uno')).toBe(false)
    expect(esTipoDeCambio(F, undefined)).toBe(false)
  })
})
