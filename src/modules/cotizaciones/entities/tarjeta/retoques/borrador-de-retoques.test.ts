import { describe, expect, it } from 'vitest'
import {
  MODO_INICIAL,
  modoDeRetoques,
  primerTextoLargo,
  type AccionDelModo,
} from './borrador-de-retoques'

const correr = (...acciones: AccionDelModo[]) => acciones.reduce(modoDeRetoques, MODO_INICIAL)

describe('modoDeRetoques', () => {
  it('empieza de los que aplican y sale vacío', () => {
    const e = correr({ tipo: 'empezar', aplican: { celdas: { a: 'x' }, filas_ocultas: ['f'] } })
    expect(e).toEqual({
      retocando: true,
      borrador: { celdas: { a: 'x' }, filas_ocultas: ['f'] },
      elegida: null,
    })
    expect(modoDeRetoques(e, { tipo: 'salir' })).toEqual(MODO_INICIAL)
    expect(correr({ tipo: 'empezar', aplican: null }).borrador).toEqual({
      celdas: {},
      filas_ocultas: [],
    })
  })

  it('el campo escribe en el borrador; Enter lo deja y Esc vuelve a lo de antes de abrirlo', () => {
    const abierto = correr(
      { tipo: 'empezar', aplican: { celdas: { a: 'Antes' } } },
      { tipo: 'elegir_celda', id: 'a' },
      { tipo: 'escribir', id: 'a', texto: 'Nuevo' },
    )
    expect(abierto.borrador.celdas).toEqual({ a: 'Nuevo' })
    expect(modoDeRetoques(abierto, { tipo: 'dejar' })).toMatchObject({
      borrador: { celdas: { a: 'Nuevo' } },
      elegida: null,
    })
    expect(modoDeRetoques(abierto, { tipo: 'cancelar_campo' })).toMatchObject({
      borrador: { celdas: { a: 'Antes' } },
      elegida: null,
    })
    // Una celda sin retoque al abrirla: Esc la deja sin retoque.
    const nueva = correr(
      { tipo: 'empezar', aplican: null },
      { tipo: 'elegir_celda', id: 'constructor' },
      { tipo: 'escribir', id: 'constructor', texto: 'x' },
      { tipo: 'cancelar_campo' },
    )
    expect(nueva.borrador.celdas).toEqual({})
  })

  it('alterna las filas y elige una', () => {
    const e = correr(
      { tipo: 'empezar', aplican: null },
      { tipo: 'alternar_fila', id: 'f' },
      { tipo: 'alternar_fila', id: 'g' },
    )
    expect(e.borrador.filas_ocultas).toEqual(['f', 'g'])
    expect(modoDeRetoques(e, { tipo: 'alternar_fila', id: 'f' }).borrador.filas_ocultas).toEqual([
      'g',
    ])
    expect(modoDeRetoques(e, { tipo: 'elegir_fila', id: 'g' }).elegida).toEqual({
      tipo: 'fila',
      id: 'g',
    })
  })
})

describe('primerTextoLargo', () => {
  it('la primera celda en orden C con más de 300 caracteres (en code points)', () => {
    expect(
      primerTextoLargo({ celdas: { b: 'x'.repeat(301), a: 'y'.repeat(301) }, filas_ocultas: [] }),
    ).toBe('a')
    expect(primerTextoLargo({ celdas: { a: '🚗'.repeat(300) }, filas_ocultas: [] })).toBeNull()
  })
})
