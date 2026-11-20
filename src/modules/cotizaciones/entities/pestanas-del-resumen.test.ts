import { describe, expect, it } from 'vitest'
import {
  CLAVE_DE_PESTANA_DEL_RESUMEN,
  PESTANAS_DEL_RESUMEN_DE_COTIZACION,
  pestanaDelResumenDeCotizacion,
  pestanasDelResumenDeCotizacion,
} from './pestanas-del-resumen'

describe('pestanaDelResumenDeCotizacion', () => {
  it('lee las cinco pestañas que existen', () => {
    expect(PESTANAS_DEL_RESUMEN_DE_COTIZACION.map((p) => p.clave)).toEqual([
      'todo',
      'adjuntos',
      'revisiones',
      'comentarios',
      'vehiculo',
    ])
    for (const { clave } of PESTANAS_DEL_RESUMEN_DE_COTIZACION) {
      expect(pestanaDelResumenDeCotizacion(clave)).toBe(clave)
    }
  })

  it('sin vehículo no hay quinta pestaña y «vehiculo» abre «Todo»', () => {
    expect(pestanasDelResumenDeCotizacion({ conVehiculo: false }).map((p) => p.clave)).toEqual([
      'todo',
      'adjuntos',
      'revisiones',
      'comentarios',
    ])
    expect(pestanasDelResumenDeCotizacion({ conVehiculo: true })).toHaveLength(5)
    expect(pestanaDelResumenDeCotizacion('vehiculo', { conVehiculo: false })).toBe('todo')
    expect(pestanaDelResumenDeCotizacion('vehiculo', { conVehiculo: true })).toBe('vehiculo')
  })

  it('lo que no es una pestaña abre «Todo»', () => {
    expect(pestanaDelResumenDeCotizacion(null)).toBe('todo')
    expect(pestanaDelResumenDeCotizacion(undefined)).toBe('todo')
    expect(pestanaDelResumenDeCotizacion('')).toBe('todo')
    expect(pestanaDelResumenDeCotizacion('fotos')).toBe('todo')
    expect(pestanaDelResumenDeCotizacion('constructor')).toBe('todo')
  })

  it('usa la clave de los demás resúmenes', () => {
    expect(CLAVE_DE_PESTANA_DEL_RESUMEN).toBe('pestana')
  })
})
