import { describe, expect, it } from 'vitest'
import { dondeDelModo, falloDelModo, NO_SE_GUARDO } from './fallo-del-modo'

describe('falloDelModo', () => {
  it('una regla va junto a su celda o su fila; sin donde, en los avisos', () => {
    expect(
      falloDelModo({ codigo: 'validacion', mensaje: 'm', causa: 'celdas.c_1' }, false),
    ).toEqual({
      tipo: 'regla',
      mensaje: 'm',
      donde: { tipo: 'celda', id: 'c_1' },
    })
    expect(
      falloDelModo({ codigo: 'validacion', mensaje: 'm', causa: 'filas_ocultas.f' }, false),
    ).toMatchObject({
      donde: { tipo: 'fila', id: 'f' },
    })
    expect(
      falloDelModo({ codigo: 'validacion', mensaje: 'm', causa: 'retoques' }, false),
    ).toMatchObject({ donde: null })
    expect(dondeDelModo('filas_ocultas[2]')).toBeNull()
  })

  it('el conflicto con el mensaje de la base, lo que ya no se puede y lo que no llegó', () => {
    expect(falloDelModo({ codigo: 'conflicto', mensaje: 'Ana cambió…' }, false)).toEqual({
      tipo: 'conflicto',
      mensaje: 'Ana cambió…',
    })
    expect(falloDelModo({ codigo: 'sin_permiso', mensaje: 'Ya no' }, false)).toEqual({
      tipo: 'sin_permiso',
      mensaje: 'Ya no',
    })
    expect(falloDelModo({ codigo: 'inesperado', mensaje: 'x' }, true)).toEqual({
      tipo: 'sin_guardar',
      mensaje: NO_SE_GUARDO,
    })
    expect(falloDelModo({ codigo: 'inesperado', mensaje: 'x' }, false).tipo).toBe('sin_guardar')
  })
})
