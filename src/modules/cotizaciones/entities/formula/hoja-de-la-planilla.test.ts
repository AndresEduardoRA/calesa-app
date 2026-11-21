import { describe, expect, it } from 'vitest'
import type { Formula } from '../formula'
import type { Nodo } from '../nodos'
import { referenciasDe } from '../nodos-referencias'
import { formulaDePrueba } from './fila-de-prueba.soporte'
import { bDe, celdaDe, hojaDeLaPlanilla, numeroDeLaCelda } from './hoja-de-la-planilla'

const NODOS = [
  { id: 'tc', tipo: 'tipo_cambio', clave: 'oficial', etiqueta: 'TC oficial' },
  { id: 'remate', tipo: 'input', etiqueta: 'Remate', grupo: 'afuera' },
  { id: 'fees', tipo: 'constante', etiqueta: 'Fees', grupo: 'afuera' },
  { id: 'agencia_pct', tipo: 'constante', etiqueta: 'Agencia (%)', formato: 'pct' },
  {
    id: 'agencia',
    tipo: 'calculo',
    op: 'porcentaje_de',
    etiqueta: 'Agencia',
    de: ['remate'],
    pct: 'agencia_pct',
    grupo: 'afuera',
  },
  { id: 'iva_pct', tipo: 'constante', etiqueta: 'IVA (%)', formato: 'pct' },
  {
    id: 'iva',
    tipo: 'calculo',
    op: 'porcentaje_de',
    etiqueta: 'IVA',
    de: ['fees'],
    pct: 'iva_pct',
    grupo: 'aduana',
  },
  {
    id: 'iva_remate',
    tipo: 'calculo',
    op: 'porcentaje_de',
    etiqueta: 'IVA del remate',
    de: ['remate'],
    pct: 'iva_pct',
    grupo: 'aduana',
  },
  { id: 'margen', tipo: 'input', etiqueta: 'Margen', formato: 'pct' },
  {
    id: 'utilidad',
    tipo: 'calculo',
    op: 'porcentaje_de',
    etiqueta: 'Utilidad',
    de: ['remate'],
    pct: 'margen',
    grupo: 'afuera',
  },
  {
    id: 'total',
    tipo: 'calculo',
    op: 'suma',
    etiqueta: 'Total',
    de: ['agencia', 'iva', 'iva_remate', 'utilidad'],
    salida: 'total',
  },
] as Nodo[]

const FORMULA: Formula = {
  definicion: {
    nodos: NODOS,
    grupos: [
      { id: 'afuera', etiqueta: 'Lado de afuera', tono: 'azul', bucket: 'b' },
      { id: 'aduana', etiqueta: 'Aduana', tono: 'verde', bucket: 'b' },
      { id: 'vacio', etiqueta: 'Vacío', tono: 'azul', bucket: 'b' },
    ],
  },
  params: { constantes: { fees: 100, agencia_pct: 0.04, iva_pct: 0.13 }, tablas: {} },
}

describe('hojaDeLaPlanilla', () => {
  const hoja = hojaDeLaPlanilla(FORMULA)

  it('numera las filas en el orden de los nodos, sin la pct que absorbe la B', () => {
    expect(hoja.filas.map((f) => `${String(f.numero)} ${f.id}`)).toEqual([
      '1 tc',
      '2 remate',
      '3 fees',
      '4 agencia',
      '5 iva_pct',
      '6 iva',
      '7 iva_remate',
      '8 margen',
      '9 utilidad',
      '10 total',
    ])
    expect(hoja.filas.map((f) => f.tipo).slice(0, 4)).toEqual([
      'tipo_de_cambio',
      'lo_escribe_el_asesor',
      'valor_fijo',
      'calculo',
    ])
  })

  it('la B absorbe la pct que sólo nombra su fila; la compartida y la del asesor conservan la suya', () => {
    expect(hoja.filas[3]?.pctAbsorbida).toBe('agencia_pct')
    expect(hoja.absorbidas.get('agencia_pct')).toBe(4)
    expect(celdaDe(hoja, 'agencia_pct')).toBe('B4')
    expect(celdaDe(hoja, 'agencia')).toBe('C4')
    expect(bDe(hoja, 4)).toEqual({ id: 'agencia_pct', como: 'absorbida' })
    expect(bDe(hoja, 6)).toEqual({ id: 'iva_pct', como: 'fila' })
    expect(bDe(hoja, 9)).toEqual({ id: 'margen', como: 'fila' })
    expect(bDe(hoja, 2)).toBeNull()
    expect(numeroDeLaCelda(hoja, 'agencia_pct')).toBe(4)
    expect(numeroDeLaCelda(hoja, 'no_existe')).toBeNull()
  })

  it('una pct con grupo no se absorbe', () => {
    const nodos = NODOS.map((n) => (n.id === 'agencia_pct' ? { ...n, grupo: 'afuera' } : n))
    const h = hojaDeLaPlanilla({ ...FORMULA, definicion: { ...FORMULA.definicion, nodos } })
    expect(h.absorbidas.size).toBe(0)
    expect(bDe(h, 5)).toEqual({ id: 'agencia_pct', como: 'fila' })
  })

  it('la pct escrita en el texto de la fila es una auxiliar: la B la muestra pero no se nombra', () => {
    const f = formulaDePrueba([{ id: 'agencia', texto: '=PORCENTAJE_DE(remate; 4%)' }])
    const h = hojaDeLaPlanilla(f)
    const fila = h.filas.find((x) => x.id === 'agencia')
    expect(fila?.auxiliares.length).toBe(1)
    expect(bDe(h, fila?.numero ?? 0)?.como).toBe('auxiliar')
    expect(celdaDe(h, fila?.auxiliares[0] ?? '')).toBeNull()
  })

  it('las bandas son tramos de filas seguidas: un grupo partido lleva dos, uno sin filas va aparte', () => {
    expect(hoja.tramos).toEqual([
      { grupo: null, desde: 1, hasta: 1 },
      { grupo: 'afuera', desde: 2, hasta: 4 },
      { grupo: null, desde: 5, hasta: 5 },
      { grupo: 'aduana', desde: 6, hasta: 7 },
      { grupo: null, desde: 8, hasta: 8 },
      { grupo: 'afuera', desde: 9, hasta: 9 },
      { grupo: null, desde: 10, hasta: 10 },
    ])
    expect(hoja.gruposSinFilas).toEqual(['vacio'])
  })

  it('una fórmula vacía no tiene filas ni tramos', () => {
    const h = hojaDeLaPlanilla({ definicion: { nodos: [] } })
    expect(h.filas).toEqual([])
    expect(h.tramos).toEqual([])
  })
})

describe('hojaDeLaPlanilla › el orden dibujado', () => {
  it('ninguna fila nombra otra de más abajo', () => {
    const hoja = hojaDeLaPlanilla(FORMULA)
    const porId = new Map(NODOS.map((n) => [n.id, n]))
    const haciaAbajo: string[] = []
    for (const fila of hoja.filas) {
      const propios = [
        fila.id,
        ...fila.auxiliares,
        ...(fila.pctAbsorbida ? [fila.pctAbsorbida] : []),
      ]
      for (const id of propios) {
        const nodo = porId.get(id)
        for (const r of nodo === undefined ? [] : referenciasDe(nodo)) {
          const n = numeroDeLaCelda(hoja, r.id)
          if (n !== null && n > fila.numero) haciaAbajo.push(`${fila.id} → ${r.id}`)
          if (n === fila.numero && r.id !== fila.pctAbsorbida)
            haciaAbajo.push(`${fila.id} ↺ ${r.id}`)
        }
      }
    }
    expect(haciaAbajo).toEqual([])
  })
})
