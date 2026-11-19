import { describe, expect, it } from 'vitest'
import { TOPE_EN_BYTES_DE_LA_CUADRICULA } from '../cuadricula-de-la-tarjeta'
import { formaDeCuadricula } from './forma-de-cuadricula'
import { bytesComoJsonb } from '../json-de-la-base'
import { validarPlantilla } from './validar-plantilla'

// Lo que el juego no puede llevar: el tope de 24 KiB y lo que sólo se alcanza sin él (lo convertido desde la forma 1, D12). Lo mismo prueba la base (T2 de
// `supabase/tests/plantilla-validar.sql`).
const grilla = (columnas: number, filas: number, texto: (i: number) => string) => ({
  forma: 2,
  columnas: Array.from({ length: columnas }, (_, i) => ({ id: `c${String(i)}`, ancho: 24 })),
  filas: Array.from({ length: filas }, (_, i) => ({
    id: `f${String(i)}`,
    alto: 16,
    ocultar_si: 'nunca',
  })),
  celdas: Array.from({ length: columnas * filas }, (_, i) => ({
    id: `x${String(i)}`,
    fila: `f${String(Math.floor(i / columnas))}`,
    columna: `c${String(i % columnas)}`,
    contenido: { tipo: 'texto', texto: texto(i) },
  })),
})

const veredicto = (r: ReturnType<typeof formaDeCuadricula>) =>
  r.ok ? 'válida' : `${r.error.regla}@${r.error.donde}`

describe('formaDeCuadricula al tope', () => {
  it('10 × 10 celdas con textos de 200 caracteres pasan de 24 KiB: `forma@definicion`', () => {
    const p = grilla(10, 10, () => 'x'.repeat(200))
    expect(bytesComoJsonb(p)).toBeGreaterThan(TOPE_EN_BYTES_DE_LA_CUADRICULA)
    expect(veredicto(formaDeCuadricula(p))).toBe('forma@definicion')
    expect(veredicto(formaDeCuadricula(p, { conTope: false }))).toBe('válida')
  })

  it('justo en el tope pasa y un byte más no', () => {
    const vacia = grilla(1, 100, () => '')
    const libre = TOPE_EN_BYTES_DE_LA_CUADRICULA - bytesComoJsonb(vacia)
    // Cada carácter ASCII de un texto suma un byte; se reparten de a 300 (el máximo de un texto).
    const con = (n: number) =>
      grilla(1, 100, (i) => 'x'.repeat(Math.max(0, Math.min(300, n - i * 300))))
    expect(bytesComoJsonb(con(libre))).toBe(TOPE_EN_BYTES_DE_LA_CUADRICULA)
    expect(veredicto(formaDeCuadricula(con(libre)))).toBe('válida')
    expect(veredicto(formaDeCuadricula(con(libre + 1)))).toBe('forma@definicion')
  })

  it('1.001 celdas sólo se alcanzan sin el tope: `demasiadas_celdas` (después de las filas)', () => {
    const p = grilla(11, 91, () => '')
    expect(veredicto(formaDeCuadricula(p))).toBe('forma@definicion')
    expect(veredicto(formaDeCuadricula(p, { conTope: false }))).toBe('demasiadas_celdas@celdas')
    expect(
      veredicto(
        formaDeCuadricula(
          grilla(10, 100, () => ''),
          { conTope: false },
        ),
      ),
    ).toBe('válida')
  })

  it('validarPlantilla pasa `conTope` a la cuadrícula y la forma 1 lo ignora', () => {
    const p = grilla(10, 10, () => 'x'.repeat(200))
    const r = validarPlantilla(p, null, { conTope: false })
    expect(r.ok && r.forma).toBe(2)
    expect(validarPlantilla(p, null).ok).toBe(false)
  })
})
