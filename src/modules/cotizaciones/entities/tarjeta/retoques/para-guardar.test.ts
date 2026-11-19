import { describe, expect, it } from 'vitest'
import { mismosRetoques, retoquesParaGuardar } from './para-guardar'
import { CUADRICULA_DE_RETOQUES as P } from './retoques.soporte'

describe('retoquesParaGuardar', () => {
  it('deja sólo lo que aplica y quita los textos iguales al de la plantilla', () => {
    expect(
      retoquesParaGuardar(
        {
          celdas: { c_saludo: 'Hola', constructor: 'Chau', c_monto: 'x', c_otra: 'y' },
          filas_ocultas: ['f_otra'],
        },
        P,
      ),
    ).toEqual({ celdas: { constructor: 'Chau' } })
  })

  it('ordena las filas como la plantilla, sin repetir, y las celdas en orden C', () => {
    expect(
      retoquesParaGuardar(
        {
          celdas: { constructor: 'B', c_saludo: 'A' },
          filas_ocultas: ['constructor', 'f_titulo', 'constructor'],
        },
        P,
      ),
    ).toEqual({
      celdas: { c_saludo: 'A', constructor: 'B' },
      filas_ocultas: ['f_titulo', 'constructor'],
    })
  })

  it('sin nada que guardar, nulo', () => {
    expect(retoquesParaGuardar(null, P)).toBeNull()
    expect(retoquesParaGuardar({}, P)).toBeNull()
    expect(retoquesParaGuardar({ celdas: { c_saludo: 'Hola' }, filas_ocultas: [] }, P)).toBeNull()
  })
})

describe('mismosRetoques', () => {
  it('compara la forma canónica: el orden de las celdas no cuenta; nulo y vacío son lo mismo', () => {
    expect(mismosRetoques({ celdas: { a: '1', b: '2' } }, { celdas: { b: '2', a: '1' } })).toBe(
      true,
    )
    expect(mismosRetoques(null, {})).toBe(true)
    expect(mismosRetoques(null, { celdas: {}, filas_ocultas: [] })).toBe(true)
    expect(mismosRetoques({ celdas: { a: '1' } }, { celdas: { a: '2' } })).toBe(false)
    expect(mismosRetoques({ filas_ocultas: ['a'] }, null)).toBe(false)
  })
})
