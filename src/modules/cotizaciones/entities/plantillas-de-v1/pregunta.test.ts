import { describe, expect, it } from 'vitest'
import { preguntaDeReemplazo } from './pregunta'

const ahora = new Date('2026-11-19T15:00:00Z')
const reloj = { ahora, zona: 'America/La_Paz' }
const formula = { autor: 'Ana', tuyo: false, actualizadoEn: '2026-11-19T13:00:00.123456+00:00' }
const tarjeta = { actualizadoEn: '2026-11-19T14:58:00+00:00' }

describe('preguntaDeReemplazo', () => {
  it('sin borradores no pregunta', () => {
    expect(
      preguntaDeReemplazo('Importadora USA', 'China', { formula: null, tarjeta: null }, reloj),
    ).toBeNull()
  })

  it('con los dos, los nombra y dice que los reemplaza', () => {
    expect(preguntaDeReemplazo('Importadora USA', 'China', { formula, tarjeta }, reloj)).toBe(
      'Importadora USA ya tiene un borrador de la fórmula (de Ana, hace 2 horas) y de la tarjeta (guardado hace 2 minutos). Usar «China» los reemplaza.',
    )
  })

  it('sólo la fórmula, y el borrador propio dice «tuyo»', () => {
    expect(
      preguntaDeReemplazo(
        'Importadora USA',
        'USA (subasta)',
        { formula: { ...formula, tuyo: true }, tarjeta: null },
        reloj,
      ),
    ).toBe(
      'Importadora USA ya tiene un borrador de la fórmula (tuyo, hace 2 horas). Usar «USA (subasta)» lo reemplaza.',
    )
  })

  it('sólo la tarjeta', () => {
    expect(
      preguntaDeReemplazo('Importadora USA', 'Oficina', { formula: null, tarjeta }, reloj),
    ).toBe(
      'Importadora USA ya tiene un borrador de la tarjeta (guardado hace 2 minutos). Usar «Oficina» lo reemplaza.',
    )
  })
})
