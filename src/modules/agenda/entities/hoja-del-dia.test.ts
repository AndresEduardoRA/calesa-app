import { describe, expect, it } from 'vitest'
import { hojaDelDia, JORNADA, ROTULO_DE_ANTES, ROTULO_DE_DESPUES } from './hoja-del-dia'

const LA_PAZ = 'America/La_Paz' // UTC-4 todo el año
const NUEVA_YORK = 'America/New_York'
const DIA = '2026-11-17'
const OTRO_AHORA = '2026-11-20T15:00:00Z'

const entrada = (id: string, instante: string) => ({ id, instante })
const ids = (lista: readonly { id: string }[]) => lista.map((e) => e.id)
const filaDe = (hoja: ReturnType<typeof hojaDelDia>, hora: number) =>
  hoja.horas.find((fila) => fila.hora === hora)

describe('hojaDelDia', () => {
  it('siempre las 12 filas de la jornada, de 08:00 a 19:00', () => {
    const hoja = hojaDelDia([], { dia: DIA, zona: LA_PAZ, ahora: OTRO_AHORA })
    expect(hoja.horas).toHaveLength(JORNADA.hasta - JORNADA.desde)
    expect(hoja.horas.map((fila) => fila.etiqueta)).toEqual([
      '08:00',
      '09:00',
      '10:00',
      '11:00',
      '12:00',
      '13:00',
      '14:00',
      '15:00',
      '16:00',
      '17:00',
      '18:00',
      '19:00',
    ])
    expect(ROTULO_DE_ANTES).toBe('Antes de las 08:00')
    expect(ROTULO_DE_DESPUES).toBe('Desde las 20:00')
  })

  it('reparte por la hora de la zona: 07:59 antes, 08:00 en la 8, 19:59 en la 19, 20:00 después', () => {
    const hoja = hojaDelDia(
      [
        entrada('a', '2026-11-17T11:59:00Z'), // 07:59
        entrada('b', '2026-11-17T12:00:00Z'), // 08:00
        entrada('c', '2026-11-17T23:59:00Z'), // 19:59
        entrada('d', '2026-11-18T00:00:00Z'), // 20:00 del 17
      ],
      { dia: DIA, zona: LA_PAZ, ahora: OTRO_AHORA },
    )
    expect(ids(hoja.antes.entradas)).toEqual(['a'])
    expect(ids(filaDe(hoja, 8)?.entradas ?? [])).toEqual(['b'])
    expect(ids(filaDe(hoja, 19)?.entradas ?? [])).toEqual(['c'])
    expect(ids(hoja.despues.entradas)).toEqual(['d'])
  })

  it('un instante que en la zona es de otro día no entra (aunque en UTC sea del día)', () => {
    const hoja = hojaDelDia(
      [
        entrada('del-16', '2026-11-17T03:00:00Z'), // 23:00 del 16 en La Paz
        entrada('del-18', '2026-11-18T04:00:00Z'), // 00:00 del 18 en La Paz
      ],
      { dia: DIA, zona: LA_PAZ, ahora: OTRO_AHORA },
    )
    expect(hoja.antes.entradas).toEqual([])
    expect(hoja.despues.entradas).toEqual([])
    expect(hoja.horas.every((fila) => fila.entradas.length === 0)).toBe(true)
  })

  it('ordena por instante y, a la misma hora, por id', () => {
    const hoja = hojaDelDia(
      [
        entrada('z', '2026-11-17T14:30:00Z'),
        entrada('b', '2026-11-17T14:10:00Z'),
        entrada('a', '2026-11-17T14:10:00Z'),
      ],
      { dia: DIA, zona: LA_PAZ, ahora: OTRO_AHORA },
    )
    expect(ids(filaDe(hoja, 10)?.entradas ?? [])).toEqual(['a', 'b', 'z'])
  })

  it('un día con cambio de horario tiene las mismas 12 filas: 01:30 EDT y 01:30 EST van antes', () => {
    const hoja = hojaDelDia(
      [
        entrada('edt', '2026-11-01T05:30:00Z'), // 01:30 EDT
        entrada('est', '2026-11-01T06:30:00Z'), // 01:30 EST
        entrada('nueve', '2026-11-01T14:00:00Z'), // 09:00 EST
      ],
      { dia: '2026-11-01', zona: NUEVA_YORK, ahora: OTRO_AHORA },
    )
    expect(hoja.horas).toHaveLength(12)
    expect(ids(hoja.antes.entradas)).toEqual(['edt', 'est'])
    expect(ids(filaDe(hoja, 9)?.entradas ?? [])).toEqual(['nueve'])
  })
})

describe('hojaDelDia: la marca de «ahora»', () => {
  it('va en la fila de la hora actual si el día es hoy', () => {
    const hoja = hojaDelDia([], { dia: DIA, zona: LA_PAZ, ahora: '2026-11-17T14:25:00Z' }) // 10:25
    expect(hoja.horas.filter((fila) => fila.ahora).map((fila) => fila.hora)).toEqual([10])
    expect(hoja.antes.ahora).toBe(false)
    expect(hoja.despues.ahora).toBe(false)
  })

  it('antes de la jornada la marca va en «Antes»; después, en «Después»', () => {
    const temprano = hojaDelDia([], { dia: DIA, zona: LA_PAZ, ahora: '2026-11-17T10:00:00Z' }) // 06:00
    expect(temprano.antes.ahora).toBe(true)
    expect(temprano.horas.some((fila) => fila.ahora)).toBe(false)
    const tarde = hojaDelDia([], { dia: DIA, zona: LA_PAZ, ahora: '2026-11-18T01:00:00Z' }) // 21:00 del 17
    expect(tarde.despues.ahora).toBe(true)
    expect(tarde.horas.some((fila) => fila.ahora)).toBe(false)
  })

  it('otro día no lleva marca', () => {
    const hoja = hojaDelDia([], { dia: '2026-11-18', zona: LA_PAZ, ahora: '2026-11-17T14:25:00Z' })
    expect(hoja.antes.ahora || hoja.despues.ahora || hoja.horas.some((f) => f.ahora)).toBe(false)
  })
})
