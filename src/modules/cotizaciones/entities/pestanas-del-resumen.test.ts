import { describe, expect, it } from 'vitest'
import {
  CLAVE_DE_PESTANA_DEL_RESUMEN,
  PESTANAS_DEL_RESUMEN_DE_COTIZACION,
  pestanaDelResumenDeCotizacion,
} from './pestanas-del-resumen'

describe('pestanaDelResumenDeCotizacion', () => {
  it('lee las cuatro pestañas que existen', () => {
    expect(PESTANAS_DEL_RESUMEN_DE_COTIZACION.map((p) => p.clave)).toEqual([
      'todo',
      'adjuntos',
      'revisiones',
      'comentarios',
    ])
    for (const { clave } of PESTANAS_DEL_RESUMEN_DE_COTIZACION) {
      expect(pestanaDelResumenDeCotizacion(clave)).toBe(clave)
    }
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
