import { describe, expect, it } from 'vitest'
import { paramsParaValidar } from './params-para-validar'

describe('paramsParaValidar', () => {
  it('pone las constantes al lado de las tablas', () => {
    expect(paramsParaValidar({ params: { constantes: { a: 1 }, tablas: { t: [] } } })).toEqual({
      a: 1,
      tablas: { t: [] },
    })
  })
})
