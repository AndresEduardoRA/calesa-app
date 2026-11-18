import { describe, expect, it } from 'vitest'
import { cambioDeVehiculo, vehiculoParaCalcular } from './vehiculo-de-la-guardada'

const A = '00000000-0000-4000-8000-0000000000aa'
const B = '00000000-0000-4000-8000-0000000000bb'

describe('cambioDeVehiculo: qué deja hacer la barra del vehículo de una guardada', () => {
  it('una preventa que se puede guardar elige otro; una final, sólo dice por qué no', () => {
    expect(cambioDeVehiculo({ clase: 'preventa', puedeGuardar: true })).toBe('elige')
    expect(cambioDeVehiculo({ clase: 'final', puedeGuardar: true })).toBe('final')
  })

  it('quien sólo la ve no elige ni ve el motivo de la final', () => {
    expect(cambioDeVehiculo({ clase: 'preventa', puedeGuardar: false })).toBe('no')
    expect(cambioDeVehiculo({ clase: 'final', puedeGuardar: false })).toBe('no')
  })
})

describe('vehiculoParaCalcular: con qué vehículo calcula la hoja de una guardada', () => {
  const preventa = { clase: 'preventa' as const, vehiculoId: A }

  it('el de la URL, si es otro y quien mira puede elegirlo', () => {
    expect(vehiculoParaCalcular(preventa, true, B)).toBe(B)
  })

  it('una preventa sin vehículo también toma uno', () => {
    expect(vehiculoParaCalcular({ clase: 'preventa', vehiculoId: null }, true, B)).toBe(B)
  })

  it('el mismo que el guardado (sin importar mayúsculas) es el suyo: nulo', () => {
    expect(vehiculoParaCalcular(preventa, true, A)).toBeNull()
    expect(vehiculoParaCalcular(preventa, true, A.toUpperCase())).toBeNull()
  })

  it('sin pedido, en una final o sin poder guardar, el suyo', () => {
    expect(vehiculoParaCalcular(preventa, true, null)).toBeNull()
    expect(vehiculoParaCalcular({ clase: 'final', vehiculoId: A }, true, B)).toBeNull()
    expect(vehiculoParaCalcular(preventa, false, B)).toBeNull()
  })
})
