import { describe, expect, it } from 'vitest'
import { textoDelAviso, textoDelVacio } from './aviso-del-listado'

describe('textoDelAviso', () => {
  it('sin vehículo ni lead no hay aviso', () => {
    expect(textoDelAviso({})).toBeNull()
  })

  it('sólo vehículo: su título, o «un vehículo» si no se ve', () => {
    expect(textoDelAviso({ vehiculo: { titulo: 'Toyota Hilux' } })).toBe(
      'Cotizaciones de Toyota Hilux.',
    )
    expect(textoDelAviso({ vehiculo: { titulo: null } })).toBe('Cotizaciones de un vehículo.')
  })

  it('sólo lead: su nombre, o «un cliente» si no se ve', () => {
    expect(textoDelAviso({ lead: { nombre: 'Ana Pérez' } })).toBe('Cotizaciones de Ana Pérez.')
    expect(textoDelAviso({ lead: { nombre: null } })).toBe('Cotizaciones de un cliente.')
  })

  it('los dos: el cliente sobre el vehículo, cada uno con su «un …»', () => {
    expect(
      textoDelAviso({ lead: { nombre: 'Ana Pérez' }, vehiculo: { titulo: 'Toyota Hilux' } }),
    ).toBe('Cotizaciones de Ana Pérez sobre Toyota Hilux.')
    expect(textoDelAviso({ lead: { nombre: null }, vehiculo: { titulo: null } })).toBe(
      'Cotizaciones de un cliente sobre un vehículo.',
    )
  })
})

describe('textoDelVacio', () => {
  it('sin vehículo ni lead no hay vacío propio', () => {
    expect(textoDelVacio({})).toBeNull()
  })

  it('dice de quién es lo que no hay', () => {
    expect(textoDelVacio({ vehiculo: true })).toBe(
      'Sin cotizaciones de este vehículo que puedas ver.',
    )
    expect(textoDelVacio({ lead: true })).toBe('Sin cotizaciones de este cliente que puedas ver.')
    expect(textoDelVacio({ lead: true, vehiculo: true })).toBe(
      'Sin cotizaciones de este cliente sobre este vehículo que puedas ver.',
    )
  })
})

describe('el aviso con «Agrupar por vehículo»', () => {
  it('con un vehículo y la agrupación encendida, dice que no agrupa; sin vehículo, nada cambia', () => {
    expect(textoDelAviso({ vehiculo: { titulo: 'Hilux' }, agrupar: true })).toBe(
      'Cotizaciones de Hilux, sin agrupar.',
    )
    expect(textoDelAviso({ vehiculo: { titulo: 'Hilux' }, agrupar: false })).toBe(
      'Cotizaciones de Hilux.',
    )
    expect(textoDelAviso({ lead: { nombre: 'Ana' }, agrupar: true })).toBe('Cotizaciones de Ana.')
    expect(textoDelAviso({ agrupar: true })).toBeNull()
  })
})
