import { describe, expect, it } from 'vitest'
import { cuentaRegresiva } from './subasta-tiempo'

describe('cuentaRegresiva', () => {
  const ahora = new Date('2026-10-14T12:00:00Z')

  it('dice cuánto falta, en la unidad que importa', () => {
    expect(cuentaRegresiva('2026-10-17T16:00:00Z', ahora)).toEqual({
      tipo: 'por_empezar',
      texto: 'en 3 días 4 h',
    })
    expect(cuentaRegresiva('2026-10-14T14:15:00Z', ahora)?.texto).toBe('en 2 h 15 min')
    expect(cuentaRegresiva('2026-10-14T12:12:00Z', ahora)?.texto).toBe('en 12 min')
    expect(cuentaRegresiva('2026-10-15T12:00:00Z', ahora)?.texto).toBe('en 1 día')
  })

  it('dice hace cuánto empezó, y no falla con una fecha rota', () => {
    expect(cuentaRegresiva('2026-10-14T07:00:00Z', ahora)).toEqual({
      tipo: 'empezo',
      texto: 'hace 5 h',
    })
    expect(cuentaRegresiva('ayer', ahora)).toBeNull()
  })
})
