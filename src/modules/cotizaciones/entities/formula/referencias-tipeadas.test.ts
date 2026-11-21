import { describe, expect, it } from 'vitest'
import { FORMULA_A1, filaNueva, conNodoAntes } from './hoja-a1.soporte'
import { hojaDeLaPlanilla } from './hoja-de-la-planilla'
import {
  bordesDeReferencias,
  esperaOperando,
  insertarReferencia,
  leyendaDeReferencias,
  referenciasTipeadas,
  renumerar,
} from './referencias-tipeadas'

// 1 TC oficial · 2 Remate · 3 Fees · 4 Flete · 5 Agencia (B5 absorbida) · 6 Seguro (B6 en su texto) · 7 CIF · 8 Total.
const hoja = hojaDeLaPlanilla(FORMULA_A1)

describe('referenciasTipeadas', () => {
  it('pinta cada celda de la hoja en el orden en que aparece, con el mismo color si se repite', () => {
    const refs = referenciasTipeadas('=C2+c3*$B$5+C2', hoja)
    expect(refs.map((r) => [r.texto, r.color, r.desde, r.hasta])).toEqual([
      ['C2', 0, 1, 3],
      ['C3', 1, 4, 6],
      ['B5', 2, 7, 11],
      ['C2', 0, 12, 14],
    ])
  })

  it('un rango de C es una sola referencia con todas sus filas', () => {
    const [rango] = referenciasTipeadas('=SUMA(C2:C4)', hoja)
    expect(rango).toMatchObject({ texto: 'C2:C4', numeros: [2, 3, 4], desde: 6, hasta: 11 })
  })

  it('no pinta lo que no es una celda de la hoja, ni un texto sin «=»', () => {
    expect(referenciasTipeadas('=A2+D3+C40+B2+SUMA(primer_pago)', hoja)).toEqual([])
    expect(referenciasTipeadas('C2', hoja)).toEqual([])
  })

  it('la leyenda nombra cada referencia una vez, y los bordes dicen qué celda lleva qué color', () => {
    const refs = referenciasTipeadas('=C2+B5+SUMA(C2:C4)', hoja)
    expect(leyendaDeReferencias(refs, hoja)).toEqual([
      { texto: 'C2', color: 0, etiqueta: 'Remate' },
      { texto: 'B5', color: 1, etiqueta: '% de Agencia' },
      { texto: 'C2:C4', color: 2, etiqueta: 'Remate … Flete' },
    ])
    expect(bordesDeReferencias(refs)).toEqual(
      new Map([
        [2, { C: 0 }],
        [5, { B: 1 }],
        [3, { C: 2 }],
        [4, { C: 2 }],
      ]),
    )
  })
})

describe('insertarReferencia', () => {
  it('después de «=», un operador, «(» o «;» inserta la celda en el cursor', () => {
    expect(insertarReferencia({ texto: '=', cursor: 1, ultima: null }, 'C5', false)).toEqual({
      texto: '=C5',
      cursor: 3,
      ultima: { desde: 1, hasta: 3 },
    })
    expect(
      insertarReferencia({ texto: '=SUMA(C2; )', cursor: 10, ultima: null }, 'C3', false)?.texto,
    ).toBe('=SUMA(C2; C3)')
  })

  it('con el cursor justo después de la última insertada, la reemplaza; con Shift arma un rango', () => {
    const e = { texto: '=C5', cursor: 3, ultima: { desde: 1, hasta: 3 } }
    expect(insertarReferencia(e, 'C7', false)?.texto).toBe('=C7')
    const rango = insertarReferencia(e, 'C9', true)
    expect(rango).toEqual({ texto: '=C5:C9', cursor: 6, ultima: { desde: 1, hasta: 6 } })
    expect(insertarReferencia(rango ?? e, 'C8', true)?.texto).toBe('=C5:C8')
  })

  it('si el cursor no espera un operando, no inserta (el clic aplica)', () => {
    expect(insertarReferencia({ texto: '=C5', cursor: 3, ultima: null }, 'C7', false)).toBeNull()
    expect(insertarReferencia({ texto: '12', cursor: 2, ultima: null }, 'C7', false)).toBeNull()
    expect(esperaOperando('=C5 + ', 6)).toBe(true)
    expect(esperaOperando('C5 +', 4)).toBe(false)
  })
})

describe('renumerar', () => {
  it('cada celda sigue a su fila: con una fila nueva arriba de la 2, C2 pasa a C3 y B5 a B6', () => {
    const nueva = hojaDeLaPlanilla(conNodoAntes(FORMULA_A1, filaNueva('nueva'), 'remate'))
    expect(renumerar('=C2+B5*SUMA(C2:C4)+A1+C99', hoja, nueva)).toBe('=C3+B6*SUMA(C3:C5)+A1+C99')
  })
})
