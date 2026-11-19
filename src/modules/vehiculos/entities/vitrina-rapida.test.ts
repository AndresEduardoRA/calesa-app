import { describe, expect, it } from 'vitest'
import { datosDeLaFila } from './vitrina-rapida'

const fila = {
  id: '0b1c2d3e-0000-4000-8000-000000000001',
  titulo: 'Kia Rio',
  actualizadoEn: '2026-11-14T10:00:00Z',
  publicadoWeb: true,
  precioWeb: 15000,
  precioWebHasta: 16000,
  precioWebNota: 'Con papeles',
  destacadoWeb: true,
}

describe('datosDeLaFila', () => {
  it('sacar apaga el destacado y conserva el precio, el «hasta» y la nota', () => {
    expect(datosDeLaFila(fila, false)).toEqual({
      publicado: false,
      precio: 15000,
      precioHasta: 16000,
      nota: 'Con papeles',
      destacado: false,
    })
  })

  it('deshacer vuelve a publicar con lo guardado', () => {
    expect(datosDeLaFila(fila, true)).toMatchObject({ publicado: true, destacado: true })
  })

  it('sin precio no hay «hasta»', () => {
    expect(datosDeLaFila({ ...fila, precioWeb: null }, false)).toMatchObject({
      precio: null,
      precioHasta: null,
    })
  })
})
