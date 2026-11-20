import { describe, expect, it } from 'vitest'
import {
  aprobadaDeLaFila,
  costoEstimadoDe,
  nombreDeCompartirLaAprobada,
  montoDeLaAprobada,
  type CotizacionAprobadaDeLaFila,
} from './cotizacion-aprobada-de-la-fila'

const V1 = '11111111-1111-4111-8111-111111111111'
const V2 = '22222222-2222-4222-8222-222222222222'
const C1 = '33333333-3333-4333-8333-333333333333'

const con = (monto: string | null, modo: string | null = null): CotizacionAprobadaDeLaFila => ({
  cotizacionId: C1,
  monto,
  moneda: 'USD',
  modo,
})

describe('aprobadaDeLaFila', () => {
  const aprobadas = { [V1]: con('1234.50', 'Unificado') }

  it('la del vehículo, o nada si no hay (la celda dice «—»)', () => {
    expect(aprobadaDeLaFila(aprobadas, V1)).toEqual(aprobadas[V1])
    expect(aprobadaDeLaFila(aprobadas, V2)).toBeNull()
  })

  it('un id que es una propiedad del prototipo no es una aprobada', () => {
    expect(aprobadaDeLaFila(aprobadas, 'toString')).toBeNull()
    expect(aprobadaDeLaFila(aprobadas, '__proto__')).toBeNull()
  })
})

describe('montoDeLaAprobada', () => {
  it('el texto del numeric pasa a número para `<Monto>`', () => {
    expect(montoDeLaAprobada(con('1234.50'))).toBe(1234.5)
    expect(montoDeLaAprobada(con('0'))).toBe(0)
  })

  it('sin total (nulo o que no es un número) es nulo: la celda dice «Sin total»', () => {
    expect(montoDeLaAprobada(con(null))).toBeNull()
    expect(montoDeLaAprobada(con('no es un número'))).toBeNull()
  })
})

describe('costoEstimadoDe', () => {
  it('el monto con su moneda, el modo y el id de la cotización', () => {
    expect(costoEstimadoDe(con('27999', 'Unificado'))).toEqual({
      tipo: 'monto',
      cotizacionId: C1,
      valor: 27999,
      moneda: 'USD',
      modo: 'Unificado',
    })
  })

  it('sin modo, o con un modo en blanco, sólo el monto; el modo va sin espacios alrededor', () => {
    expect(costoEstimadoDe(con('27999'))).toMatchObject({ tipo: 'monto', modo: null })
    expect(costoEstimadoDe(con('27999', '   '))).toMatchObject({ tipo: 'monto', modo: null })
    expect(costoEstimadoDe(con('27999', ' Paralelo '))).toMatchObject({ modo: 'Paralelo' })
  })

  it('sin total, «Sin total» sin modo aunque lo traiga; un monto que no es número tampoco es total', () => {
    expect(costoEstimadoDe(con(null, 'Unificado'))).toEqual({
      tipo: 'sin_total',
      cotizacionId: C1,
    })
    expect(costoEstimadoDe(con('abc', 'Unificado'))).toEqual({
      tipo: 'sin_total',
      cotizacionId: C1,
    })
  })
})

describe('nombreDeCompartirLaAprobada', () => {
  it('el monto con su modo entre paréntesis', () => {
    expect(
      nombreDeCompartirLaAprobada(costoEstimadoDe(con('27999', 'Unificado')), 'US$27.999'),
    ).toBe('Compartir la cotización aprobada (US$27.999 · Unificado)')
  })

  it('sin modo, sólo el monto; sin total, «Sin total»', () => {
    expect(nombreDeCompartirLaAprobada(costoEstimadoDe(con('27999')), 'US$27.999')).toBe(
      'Compartir la cotización aprobada (US$27.999)',
    )
    expect(nombreDeCompartirLaAprobada(costoEstimadoDe(con(null, 'Unificado')), '')).toBe(
      'Compartir la cotización aprobada (Sin total)',
    )
  })
})
