// Los mutadores de forma de las operaciones de condición (`comparar`, `es_opcion`, `y`, `o`, `elegir`, `max` y `min`): uno por cada
// comprobación `/*F71*/`–`/*F73*/` de `_formula_forma_nodo()`, la aridad de cada operación (F33/F34) y las claves que una operación
// no lleva (F04). Cada uno deja su defecto solo en el nodo que inserta o cambia.
import { esOp, type Mutador } from './mutadores-de-formula'
import { calculo, conNodo, enNodo } from './mutadores-de-forma'

export const MUTADORES_DE_FORMA_DE_CONDICIONES: readonly Mutador[] = [
  conNodo('comparar_cmp_malo', calculo('comparar', { de: ['a', 'b'], cmp: '==' })), // F71
  conNodo('comparar_sin_cmp', calculo('comparar', { de: ['a', 'b'] })), // F71
  conNodo('es_opcion_cmp_de_numeros', calculo('es_opcion', { de: ['v'], cmp: '>', clave: 'a' })), // F71
  conNodo('es_opcion_clave_mala', calculo('es_opcion', { de: ['v'], cmp: '=', clave: 'A' })), // F72
  conNodo('es_opcion_sin_clave', calculo('es_opcion', { de: ['v'], cmp: '<>' })), // F72
  conNodo('elegir_prueba_mala', calculo('elegir', { de: ['a'], prueba: 'P' })), // F73
  conNodo('elegir_sin_prueba', calculo('elegir', { de: ['a', 'b'] })), // F73
  conNodo('comparar_tres', calculo('comparar', { de: ['a', 'b', 'c'], cmp: '>' })), // F33
  conNodo('comparar_uno', calculo('comparar', { de: ['a'], cmp: '<' })), // F33
  conNodo('es_opcion_dos', calculo('es_opcion', { de: ['v', 'w'], cmp: '=', clave: 'a' })), // F33
  conNodo('y_uno', calculo('y', { de: ['a'] })), // F33
  conNodo('o_vacio', calculo('o', { de: [] })), // F33
  conNodo('elegir_tres', calculo('elegir', { de: ['a', 'b', 'c'], prueba: 'p' })), // F33
  conNodo('max_vacio', calculo('max', { de: [] })), // F33
  conNodo('min_elemento_malo', calculo('min', { de: ['a', 'B'] })), // F34
  enNodo('cmp_en_suma', esOp('suma'), (n) => (n['cmp'] = '>')), // F04
  conNodo('prueba_en_comparar', calculo('comparar', { de: ['a', 'b'], cmp: '>', prueba: 'p' })), // F04
  conNodo('clave_en_max', calculo('max', { de: ['a'], clave: 'a' })), // F04
]
