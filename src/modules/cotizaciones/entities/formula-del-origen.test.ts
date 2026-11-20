import { describe, expect, it } from 'vitest'
import {
  LARGO_DEL_NOMBRE,
  MENSAJES_DE_LA_FORMULA_DEL_ORIGEN,
  nombreDeLaFormula,
  TOPE_DE_FORMULAS_DEL_ORIGEN,
} from './formula-del-origen'

const rechazo = {
  ok: false,
  error: { codigo: 'validacion', mensaje: MENSAJES_DE_LA_FORMULA_DEL_ORIGEN.largo },
}

describe('nombreDeLaFormula', () => {
  it('rechaza el vacío y lo que sólo tiene espacios', () => {
    expect(nombreDeLaFormula('')).toEqual(rechazo)
    expect(nombreDeLaFormula('   ')).toEqual(rechazo)
  })

  it('acepta de 1 a 60 caracteres y rechaza 61', () => {
    expect(nombreDeLaFormula('A')).toEqual({ ok: true, data: 'A' })
    const sesenta = 'a'.repeat(LARGO_DEL_NOMBRE)
    expect(nombreDeLaFormula(sesenta)).toEqual({ ok: true, data: sesenta })
    expect(nombreDeLaFormula(`${sesenta}b`)).toEqual(rechazo)
  })

  it('quita los espacios de los bordes antes de contar', () => {
    expect(nombreDeLaFormula(`  ${'a'.repeat(LARGO_DEL_NOMBRE)}  `)).toEqual({
      ok: true,
      data: 'a'.repeat(LARGO_DEL_NOMBRE),
    })
    expect(nombreDeLaFormula('  Planilla 2026 ')).toEqual({ ok: true, data: 'Planilla 2026' })
  })

  it('cuenta un emoji como un carácter, como char_length', () => {
    const sesentaEmojis = '🚗'.repeat(LARGO_DEL_NOMBRE)
    expect(sesentaEmojis.length).toBe(LARGO_DEL_NOMBRE * 2)
    expect(nombreDeLaFormula(sesentaEmojis)).toEqual({ ok: true, data: sesentaEmojis })
    expect(nombreDeLaFormula(`${sesentaEmojis}🚙`)).toEqual(rechazo)
  })

  it('los textos dicen los mismos números que la base', () => {
    expect(MENSAJES_DE_LA_FORMULA_DEL_ORIGEN.largo).toBe('El nombre lleva de 1 a 60 caracteres.')
    expect(MENSAJES_DE_LA_FORMULA_DEL_ORIGEN.tope).toBe(
      'Este origen ya tiene 50 fórmulas: archiva o elimina alguna.',
    )
    expect(TOPE_DE_FORMULAS_DEL_ORIGEN).toBe(50)
    expect(MENSAJES_DE_LA_FORMULA_DEL_ORIGEN.repetido('Planilla')).toBe(
      'Ya hay una fórmula «Planilla» en este origen.',
    )
  })
})
