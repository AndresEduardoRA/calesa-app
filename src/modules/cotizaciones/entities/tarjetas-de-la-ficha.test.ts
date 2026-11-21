import { describe, expect, it } from 'vitest'
import { tarjetasALaVista } from './tarjetas-de-la-ficha'

describe('tarjetasALaVista', () => {
  it('con diez o menos y sin otra página, ningún «Ver más»', () => {
    const filas = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }))
    expect(tarjetasALaVista(filas, false)).toEqual({ filas, hayMas: false })
  })

  it('con la aprobada fijada fuera de las diez (once) corta a diez y dice que hay más', () => {
    const filas = Array.from({ length: 11 }, (_, i) => ({ id: String(i) }))
    const vista = tarjetasALaVista(filas, false)
    expect(vista.filas).toHaveLength(10)
    expect(vista.hayMas).toBe(true)
  })

  it('otra página dice que hay más aunque lleguen diez', () => {
    expect(tarjetasALaVista([{ id: 'a' }], true).hayMas).toBe(true)
  })

  it('no repite una cotización', () => {
    expect(tarjetasALaVista([{ id: 'a' }, { id: 'a' }, { id: 'b' }], false).filas).toEqual([
      { id: 'a' },
      { id: 'b' },
    ])
  })
})
