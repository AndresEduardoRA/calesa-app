import { describe, expect, it } from 'vitest'
import { camposQueFaltan } from './campos-que-faltan'

// Los casos de `supabase/tests/areas/formula/fdo-crear.sql`: un campo común nunca falta; uno del origen tampoco; uno que el origen no tiene, sí.
describe('camposQueFaltan', () => {
  const definicion = {
    nodos: [
      { id: 'anio', tipo: 'campo_vehiculo', campo: 'anio' },
      { id: 'puerto', tipo: 'campo_vehiculo', campo: 'puerto' },
      { id: 'lote', tipo: 'campo_vehiculo', campo: 'lote' },
      { id: 'tc', tipo: 'tipo_cambio', clave: 'usd' },
      { id: 'vacio', tipo: 'campo_vehiculo' },
    ],
  }

  it('los del vehículo que no son comunes ni del origen, en orden', () => {
    expect(camposQueFaltan(definicion, new Set(['lote']))).toEqual([
      { nodo: 'puerto', campo: 'puerto' },
      { nodo: 'vacio', campo: '' },
    ])
  })

  it('sin definición, nada', () => {
    expect(camposQueFaltan(null, new Set())).toEqual([])
  })
})
