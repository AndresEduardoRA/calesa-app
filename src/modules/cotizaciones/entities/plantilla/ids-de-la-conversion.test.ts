import { describe, expect, it } from 'vitest'
import { ES_ID } from '../json-de-la-base'
import { fnv1a32, idDeLaCelda, idDeLaFila, idDerivado } from './ids-de-la-conversion'

// Los mismos valores prueba la base (T3 de `supabase/tests/areas/tarjeta/plantilla-convertir.sql`).
describe('los ids de la conversión', () => {
  it('FNV-1a de 32 bits: los valores conocidos', () => {
    expect(fnv1a32('')).toBe('811c9dc5')
    expect(fnv1a32('a')).toBe('e40c292c')
  })

  it('hasta 41 caracteres quedan igual; más, 32 + `_` + el hash (41 en total)', () => {
    const largo = 'a'.repeat(41)
    expect(idDeLaFila('n', 'a'.repeat(39))).toBe(`n_${'a'.repeat(39)}`)
    expect(idDeLaFila('n', largo)).toBe('n_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa_6313f1d9')
    expect(idDeLaCelda(`n_${largo}`, 'concepto')).toBe('c_n_aaaaaaaaaaaaaaaaaaaaaaaaaaaa_d18778b9')
    for (const id of [idDerivado(`c_${'z'.repeat(80)}`), idDeLaFila('a', largo)]) {
      expect(id).toHaveLength(41)
      expect(ES_ID.test(id)).toBe(true)
    }
  })
})
