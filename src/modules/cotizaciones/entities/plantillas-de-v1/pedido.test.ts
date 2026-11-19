import { describe, expect, it } from 'vitest'
import { coloresDeLaPlantilla } from './colores'
import { plantillaConClaves } from './con-claves'
import { notaDeLaPlantilla, pedidoDeLaPlantilla } from './pedido'
import { plantillaDeV1 } from '.'

describe('pedidoDeLaPlantilla', () => {
  const oficina = plantillaDeV1('oficina')
  const catalogo = [{ clave: 'v1_gris', nombre: 'V1 gris', hex: '#d8d8d8' }]
  const plan = coloresDeLaPlantilla(oficina, catalogo, 48)
  if (!plan.ok) throw new Error('el plan de la prueba cabe')

  it('lleva la plantilla con sus claves, la nota, lo que se reusa y lo que se crea con su id', () => {
    const conClaves = plantillaConClaves(oficina, plan.mapa)
    const ids = plan.crear.map((_, i) => `00000000-0000-4000-8000-00000000000${i}`)
    const pedido = pedidoDeLaPlantilla(conClaves, plan, ids)
    expect(Object.keys(pedido)).toEqual([
      'definicion',
      'params',
      'diseno',
      'tarjeta',
      'nota',
      'reusar',
      'crear',
    ])
    expect(pedido.nota).toBe('Empezado desde la plantilla de V1 «Oficina».')
    expect(pedido.params).toEqual({})
    expect(pedido.tarjeta).toBe(conClaves.tarjeta)
    expect(pedido.reusar).toEqual([{ clave: 'v1_gris', hex: '#d8d8d8' }])
    expect(pedido.crear.map((c) => [c.id, c.clave])).toEqual([
      ['00000000-0000-4000-8000-000000000000', 'v1_verde_oscuro'],
      ['00000000-0000-4000-8000-000000000001', 'v1_verde_claro'],
      ['00000000-0000-4000-8000-000000000002', 'v1_amarillo_fuerte'],
      ['00000000-0000-4000-8000-000000000003', 'v1_naranja_claro'],
    ])
    expect(pedido.crear[0]).toEqual({
      id: '00000000-0000-4000-8000-000000000000',
      nombre: 'V1 verde oscuro',
      hex: '#1e6b3a',
      clave: 'v1_verde_oscuro',
    })
  })

  it('pide un id por color nuevo', () => {
    expect(() => pedidoDeLaPlantilla(oficina, plan, [])).toThrow('Hacen falta 4 ids')
  })

  it('la nota nombra la plantilla', () => {
    expect(notaDeLaPlantilla('USA (subasta)')).toBe(
      'Empezado desde la plantilla de V1 «USA (subasta)».',
    )
  })
})
