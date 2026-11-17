import { describe, expect, it } from 'vitest'
import { bloqueALaVista } from './bloque-a-la-vista'

const bloques = [
  { ancla: 'seguimientos', arriba: 300 },
  { ancla: 'oportunidades', arriba: 900 },
  { ancla: 'relacionados', arriba: 1500 },
]

describe('bloqueALaVista', () => {
  it('sin bloques no marca ninguno', () => {
    expect(bloqueALaVista([], 100, true)).toBeNull()
  })

  it('arriba de todos, ninguno cruzó la línea', () => {
    expect(bloqueALaVista(bloques, 120, false)).toBeNull()
  })

  it('marca el último que cruzó la línea', () => {
    expect(bloqueALaVista(bloques, 300, false)).toBe('seguimientos')
    expect(bloqueALaVista(bloques, 1000, false)).toBe('oportunidades')
    expect(bloqueALaVista(bloques, 5000, false)).toBe('relacionados')
  })

  it('al final de la página marca el último aunque no haya llegado a la línea', () => {
    expect(bloqueALaVista(bloques, 120, true)).toBe('relacionados')
  })

  it('con la página desplazada, un bloque que quedó arriba (posición negativa) sigue contando', () => {
    const desplazados = bloques.map((b) => ({ ...b, arriba: b.arriba - 1200 }))
    expect(bloqueALaVista(desplazados, 120, false)).toBe('oportunidades')
  })
})
