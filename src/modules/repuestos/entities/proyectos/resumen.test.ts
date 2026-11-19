import { describe, expect, it } from 'vitest'
import { proyectoDeVehiculoDesde } from './resumen'

const FILA = {
  id: '00000000-0000-4000-8000-0000000000a1',
  numero: 7,
  cerrado_en: null,
  actualizado_en: '2026-11-19T10:00:00.123456+00:00',
}

describe('proyectoDeVehiculoDesde', () => {
  it('la fila de `repuestos_proyectos`, con sus nombres de la app', () => {
    expect(proyectoDeVehiculoDesde(FILA)).toEqual({
      id: FILA.id,
      numero: 7,
      cerradoEn: null,
      actualizadoEn: FILA.actualizado_en,
    })
  })

  it('una fila con otra forma: nulo', () => {
    expect(proyectoDeVehiculoDesde({ ...FILA, id: 'uno' })).toBeNull()
    expect(proyectoDeVehiculoDesde({ ...FILA, numero: 0 })).toBeNull()
    expect(proyectoDeVehiculoDesde(null)).toBeNull()
  })
})
