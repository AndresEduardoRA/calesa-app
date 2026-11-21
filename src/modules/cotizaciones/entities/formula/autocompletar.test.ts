import { describe, expect, it } from 'vitest'
import type { Formula } from '../formula'
import type { Nodo } from '../nodos'
import { sugerencias, TOPE_DE_SUGERENCIAS, type ContextoDelAutocompletar } from './autocompletar'
import { FORMULA_A1 } from './hoja-a1.soporte'
import { hojaDeLaPlanilla } from './hoja-de-la-planilla'

const CTX: ContextoDelAutocompletar = {
  hoja: hojaDeLaPlanilla(FORMULA_A1),
  numero: 8,
  tablas: [
    { clave: 'fletes', columnas: ['origen', 'precio'] },
    { clave: 'fletes_aereos', columnas: ['origen', 'precio_kg'] },
    { clave: 'seguros', columnas: ['tipo'] },
  ],
  grupos: [{ id: 'primer_pago', etiqueta: 'Primer pago' }],
}
const ver = (texto: string, cursor = texto.length, c = CTX) =>
  sugerencias(texto, cursor, c).map((s) => `${s.clase} ${s.texto} → ${s.insertar}`)

describe('sugerencias', () => {
  it('funciones por prefijo, con firma, ejemplo y el tramo a reemplazar', () => {
    const [suma] = sugerencias('=su', 3, CTX)
    expect(suma).toEqual({
      clase: 'funcion',
      texto: 'SUMA',
      detalle: 'SUMA(valor; valor; …)',
      ejemplo: '=SUMA(C5:C9)',
      insertar: 'SUMA(',
      desde: 1,
      hasta: 3,
    })
  })

  it('un concepto da su referencia, sólo de las filas de arriba', () => {
    expect(ver('=C2+re')).toEqual(['funcion REDONDEAR → REDONDEAR(', 'concepto Remate → C2'])
    expect(ver('=fl', 3, { ...CTX, numero: 3 })).toEqual([])
    expect(ver('=fl')).toEqual(['concepto Flete → C4'])
    // Una palabra de la etiqueta, sin tildes.
    expect(ver('=ofi')).toEqual(['concepto TC oficial → C1'])
  })

  it('una banda se suma por su id', () => {
    expect(ver('=pri')).toEqual(['banda Primer pago → SUMA(primer_pago)'])
    expect(ver('=SUMA(pri')).toEqual(['banda Primer pago → primer_pago'])
  })

  it('dentro de BUSCARV: las tablas en el 2.º argumento y sus columnas en el 3.º', () => {
    expect(ver('=BUSCARV(C2; ')).toEqual([
      'tabla fletes → "fletes"',
      'tabla fletes_aereos → "fletes_aereos"',
      'tabla seguros → "seguros"',
    ])
    const [tabla] = sugerencias('=BUSCARV(C2; "fletes_a', 22, CTX)
    expect(tabla).toMatchObject({ insertar: '"fletes_aereos"', desde: 13, hasta: 22 })
    expect(ver('=BUSCARV(C2; "fletes"; ')).toEqual([
      'columna origen → "origen"',
      'columna precio → "precio"',
    ])
    expect(ver('=BUSCARV(C2; "fletes"; "pr')).toEqual(['columna precio → "precio"'])
  })

  it('con el cursor en medio, reemplaza sólo lo escrito antes', () => {
    const [r] = sugerencias('=rem+C3', 4, CTX).filter((s) => s.clase === 'concepto')
    expect(r).toMatchObject({ insertar: 'C2', desde: 1, hasta: 4 })
  })

  it('sin «=», sin letras o con una celda ya escrita, nada', () => {
    expect(ver('re')).toEqual([])
    expect(ver('=')).toEqual([])
    expect(ver('=C2+')).toEqual([])
    expect(ver('=C5')).toEqual([])
  })

  it(`a lo sumo ${String(TOPE_DE_SUGERENCIAS)}`, () => {
    const nodos = Array.from(
      { length: 12 },
      (_, i) =>
        ({ id: `costo_${String(i)}`, tipo: 'input', etiqueta: `Costo ${String(i)}` }) as Nodo,
    )
    const f: Formula = { ...FORMULA_A1, definicion: { nodos } }
    expect(sugerencias('=co', 3, { ...CTX, hoja: hojaDeLaPlanilla(f), numero: 13 })).toHaveLength(
      TOPE_DE_SUGERENCIAS,
    )
  })
})
