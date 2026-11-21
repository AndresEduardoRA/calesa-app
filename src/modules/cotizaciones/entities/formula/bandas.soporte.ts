// Una fórmula con dos bandas para probar bandas y el total (`bandas.test.ts`, `total-de-la-formula.test.ts`). Sólo para las pruebas: `ga` (bucket `a` → `tca`,
// clave `oficial`) con Cinco y Uno, `gb` (bucket `b` → `tcb`, clave `paralelo`) con Dos; Suelta sin banda; el total en `tca`.
import type { Formula } from '../formula'
import type { Nodo } from '../nodos'
import { validarFormula } from '../validar'
import { paramsParaValidar } from './params-para-validar'

export const FORMULA_BANDAS: Formula = {
  definicion: {
    nodos: [
      { id: 'tca', tipo: 'tipo_cambio', etiqueta: 'TC A', clave: 'oficial' },
      { id: 'tcb', tipo: 'tipo_cambio', etiqueta: 'TC B', clave: 'paralelo' },
      { id: 'cinco', tipo: 'constante', etiqueta: 'Cinco', grupo: 'ga' },
      { id: 'uno', tipo: 'constante', etiqueta: 'Uno', grupo: 'ga' },
      { id: 'dos', tipo: 'constante', etiqueta: 'Dos', grupo: 'gb' },
      { id: 'suelta', tipo: 'input', etiqueta: 'Suelta' },
      { id: 'pct', tipo: 'constante', etiqueta: 'Porcentaje', formato: 'pct' },
      { id: 'bandera', tipo: 'bandera', etiqueta: 'Bandera' },
      {
        id: 'total',
        tipo: 'calculo',
        op: 'suma',
        etiqueta: 'Total',
        salida: 'total',
        de: ['cinco', 'uno', 'dos', 'suelta'],
      },
    ] as Nodo[],
    buckets: { a: 'tca', b: 'tcb' },
    total_en: 'tca',
    grupos: [
      { id: 'ga', etiqueta: 'Grupo A', tono: 'verde', bucket: 'a' },
      { id: 'gb', etiqueta: 'Grupo B', tono: 'naranja', bucket: 'b' },
    ],
  },
  params: { constantes: { cinco: 5, uno: 1, dos: 2, pct: 0.13 }, tablas: {} },
}

// La regla de la fórmula que falla, o nula si vale.
export function reglaQueFalla(formula: Formula): string | null {
  const v = validarFormula(formula.definicion, paramsParaValidar(formula))
  return v.ok ? null : v.error.regla
}
