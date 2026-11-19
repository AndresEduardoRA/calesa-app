import { describe, expect, it } from 'vitest'
import { TOPE_EN_BYTES_DE_LA_CUADRICULA } from '../../cuadricula-de-la-tarjeta'
import { vaciar } from './contenido'
import { celda, grilla, rect, texto } from './edicion.soporte'
import { MOTIVOS_DE_LOS_TOPES, anchoTotal, bytesDe, medido, motivoDelTope } from './limites'

const LARGO = 'x'.repeat(300)
// 10 × 8 casillas, todas con un texto de 300: pasa los 24 KiB (lo que una forma 1 convertida grande puede traer).
const GRANDE = grilla(
  10,
  8,
  Array.from({ length: 80 }, (_, i) =>
    celda(`c${(i + 1).toString(36)}`, Math.floor(i / 8), i % 8, texto(LARGO)),
  ),
)

describe('motivoDelTope', () => {
  it('cada tope con su motivo, sólo si crece', () => {
    const p = grilla(2, 2)
    expect(motivoDelTope(p, grilla(2, 17))).toBe(MOTIVOS_DE_LOS_TOPES.columnas)
    expect(motivoDelTope(p, grilla(121, 2))).toBe(MOTIVOS_DE_LOS_TOPES.filas)
    expect(motivoDelTope(p, grilla(2, 16, [], 101))).toBe(MOTIVOS_DE_LOS_TOPES.ancho)
    const muchas = grilla(
      40,
      16,
      Array.from({ length: 1001 }, (_, i) =>
        celda(`c${(i + 1).toString(36)}`, Math.floor(i / 16) % 40, i % 16),
      ),
    )
    expect(motivoDelTope(p, muchas)).toBe(MOTIVOS_DE_LOS_TOPES.celdas)
    expect(motivoDelTope(p, GRANDE)).toBe(MOTIVOS_DE_LOS_TOPES.bytes)
    expect(motivoDelTope(p, grilla(3, 3))).toBeNull()
  })

  it('una plantilla que ya pasa un tope no bloquea lo que la achica', () => {
    expect(bytesDe(GRANDE)).toBeGreaterThan(TOPE_EN_BYTES_DE_LA_CUADRICULA)
    const achicada = vaciar(GRANDE, rect(0, 0))
    expect(achicada.ok).toBe(true)
    expect(motivoDelTope(GRANDE, grilla(10, 8, GRANDE.celdas.slice(1)))).toBeNull()
    // Lo que la agranda, sí.
    const conUnaMas = grilla(11, 8, [...GRANDE.celdas, celda('zz', 10, 0, texto('y'))])
    expect(motivoDelTope(GRANDE, conUnaMas)).toBe(MOTIVOS_DE_LOS_TOPES.bytes)
  })

  it('el ancho total suma las columnas', () => {
    expect(anchoTotal(grilla(1, 3, [], 120))).toBe(360)
  })
})

describe('medido', () => {
  const p = grilla(2, 2, [celda('a', 0, 0)])
  it('deja pasar lo que entra y un rechazo tal cual', () => {
    const bien = { ok: true as const, plantilla: grilla(2, 3), anuncio: 'x' }
    expect(medido(p, bien)).toBe(bien)
    expect(medido(p, { ok: false, motivo: 'no' })).toEqual({ ok: false, motivo: 'no' })
  })
  it('rechaza lo que pasa un tope', () => {
    expect(medido(p, { ok: true, plantilla: grilla(2, 17), anuncio: 'x' })).toEqual({
      ok: false,
      motivo: MOTIVOS_DE_LOS_TOPES.columnas,
    })
  })
  it('rechaza lo que rompe una regla de la grilla que antes no rompía', () => {
    const pisadas = grilla(2, 2, [
      { ...celda('a', 0, 0, texto('A')), abarca_columnas: 2 },
      celda('b', 0, 1),
    ])
    const r = medido(p, { ok: true, plantilla: pisadas, anuncio: 'x' })
    expect(r.ok).toBe(false)
    expect(r.ok ? '' : r.motivo).toContain('pisa otra celda')
  })
})
