import { describe, expect, it } from 'vitest'
import { esVentanaDelCierre, ventanaDelCierre } from './ventana-del-cierre'

const LA_PAZ = 'America/La_Paz'

describe('ventanaDelCierre', () => {
  it('«Cierra hoy» va de ahora a la medianoche de la empresa', () => {
    // Viernes 20 de noviembre, 10:00 en La Paz (UTC−4).
    expect(ventanaDelCierre('hoy', '2026-11-20T14:00:00.000Z', LA_PAZ)).toEqual({
      desde: '2026-11-20T14:00:00.000Z',
      hasta: '2026-11-21T04:00:00.000Z',
    })
  })

  it('«Cierra hoy» usa el día de la empresa, no el de UTC', () => {
    // 23:30 en La Paz del viernes = 03:30 UTC del sábado.
    expect(ventanaDelCierre('hoy', '2026-11-21T03:30:00.000Z', LA_PAZ).hasta).toBe(
      '2026-11-21T04:00:00.000Z',
    )
  })

  it('«Cierra en 48 h» son 48 horas justas desde ahora', () => {
    expect(ventanaDelCierre('48h', '2026-11-20T14:00:00.123Z', LA_PAZ)).toEqual({
      desde: '2026-11-20T14:00:00.123Z',
      hasta: '2026-11-22T14:00:00.123Z',
    })
  })

  it('«Cierra esta semana» termina el lunes siguiente a las 00:00 de la empresa', () => {
    // Viernes → lunes 23.
    expect(ventanaDelCierre('semana', '2026-11-20T14:00:00.000Z', LA_PAZ).hasta).toBe(
      '2026-11-23T04:00:00.000Z',
    )
  })

  it('el domingo por la noche cierra la semana; el lunes a las 00:00 empieza otra', () => {
    // Domingo 22, 23:59 en La Paz.
    expect(ventanaDelCierre('semana', '2026-11-23T03:59:00.000Z', LA_PAZ).hasta).toBe(
      '2026-11-23T04:00:00.000Z',
    )
    // Lunes 23, 00:00 en La Paz: hasta el lunes 30.
    expect(ventanaDelCierre('semana', '2026-11-23T04:00:00.000Z', LA_PAZ).hasta).toBe(
      '2026-11-30T04:00:00.000Z',
    )
  })

  it('con horario de verano, la medianoche siguiente tiene su propio desfase', () => {
    // Sábado 7 de marzo de 2026 en Nueva York (UTC−5); el domingo 8 pasa a UTC−4.
    expect(ventanaDelCierre('hoy', '2026-03-07T20:00:00.000Z', 'America/New_York').hasta).toBe(
      '2026-03-08T05:00:00.000Z',
    )
    // Esa semana (lunes 2 a domingo 8) termina el lunes 9 a las 00:00 de UTC−4.
    expect(ventanaDelCierre('semana', '2026-03-07T20:00:00.000Z', 'America/New_York').hasta).toBe(
      '2026-03-09T04:00:00.000Z',
    )
  })

  it('reconoce sólo sus tres ventanas', () => {
    expect(esVentanaDelCierre('hoy')).toBe(true)
    expect(esVentanaDelCierre('semana')).toBe(true)
    expect(esVentanaDelCierre('vivas')).toBe(false)
  })
})
