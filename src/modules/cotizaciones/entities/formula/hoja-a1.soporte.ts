// Una fórmula chica para probar las referencias A1 (`referencias-a1.test.ts`, `de-a1.test.ts`). Sólo para las pruebas. Las filas quedan:
// 1 TC oficial · 2 Remate · 3 Fees · 4 Flete · 5 Agencia (B5 = su % absorbido) · 6 Seguro (B6 = un % escrito en su texto) · 7 CIF · 8 Total.
import type { Formula } from '../formula'
import type { Nodo } from '../nodos'

export const NODOS_A1 = [
  { id: 'tc', tipo: 'tipo_cambio', clave: 'oficial', etiqueta: 'TC oficial' },
  { id: 'remate', tipo: 'input', etiqueta: 'Remate', formato: 'usd' },
  { id: 'fees', tipo: 'constante', etiqueta: 'Fees', formato: 'usd' },
  { id: 'flete', tipo: 'input', etiqueta: 'Flete', formato: 'usd' },
  { id: 'agencia_pct', tipo: 'constante', etiqueta: 'Agencia (%)', formato: 'pct' },
  {
    id: 'agencia',
    tipo: 'calculo',
    op: 'porcentaje_de',
    etiqueta: 'Agencia',
    de: ['remate'],
    pct: 'agencia_pct',
  },
  { id: 'seguro__1', tipo: 'constante', etiqueta: 'Seguro', formato: 'pct' },
  {
    id: 'seguro',
    tipo: 'calculo',
    op: 'porcentaje_de',
    etiqueta: 'Seguro',
    de: ['fees'],
    pct: 'seguro__1',
    texto: '=PORCENTAJE_DE(fees; 2%)',
  },
  {
    id: 'cif',
    tipo: 'calculo',
    op: 'suma',
    etiqueta: 'CIF',
    de: ['remate', 'fees', 'flete'],
    texto: '=SUMA(remate; fees; flete)',
  },
  {
    id: 'total',
    tipo: 'calculo',
    op: 'suma',
    etiqueta: 'Total',
    de: ['cif', 'agencia'],
    salida: 'total',
    texto: '=cif+agencia',
  },
] as Nodo[]

export const FORMULA_A1: Formula = {
  definicion: {
    nodos: NODOS_A1,
    grupos: [{ id: 'primer_pago', etiqueta: 'Primer pago', tono: 'azul', bucket: 'b' }],
    buckets: { b: 'tc' },
  },
  params: {
    constantes: { fees: 100, agencia_pct: 0.04, seguro__1: 0.02 },
    tablas: {},
  },
}

// La fórmula con `nodo` puesto justo antes de `antesDe` (o al final).
export function conNodoAntes(formula: Formula, nodo: Nodo, antesDe: string | null): Formula {
  const nodos = [...formula.definicion.nodos]
  const i = antesDe === null ? -1 : nodos.findIndex((n) => n.id === antesDe)
  nodos.splice(i === -1 ? nodos.length : i, 0, nodo)
  return { ...formula, definicion: { ...formula.definicion, nodos } }
}

export const sinNodo = (formula: Formula, id: string): Formula => ({
  ...formula,
  definicion: {
    ...formula.definicion,
    nodos: formula.definicion.nodos.filter((n) => n.id !== id),
  },
})

export const filaNueva = (id: string): Nodo =>
  ({ id, tipo: 'constante', etiqueta: 'Fila nueva', formato: 'usd' }) as Nodo
