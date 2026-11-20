// Los casos del corpus de `evaluar_formula()` (`corpus-del-motor.ts`) escritos a mano sobre las operaciones de condición y de
// extremos (`comparar`, `es_opcion`, `y`, `o`, `elegir`, `max` y `min`): la igualdad exacta entre dobles, el cero negativo, cada
// comparador, un null en cada lugar y las lecturas que lanzan `formula_sin_validar`. El esperado lo calcula el motor de TS.
import {
  bandera,
  calc,
  campo,
  caso,
  con,
  entrada,
  formula,
  inp,
  opcion,
  tc,
  total,
  type CasoAMano,
} from './constructores-del-motor'
import type { Json, Objeto } from './mutadores-de-formula'

const raw = { formato: 'raw' }
const cmp = (id: string, de: string[], c: string): Objeto =>
  calc(id, 'comparar', de, { cmp: c, ...raw })

// Una fórmula con cada comparador entre `a` y `b`, Y, O, los dos `elegir`, MAX y MIN; el total suma `x` para que siempre evalúe.
// `a`, `b` y `c` son campos del vehículo: el que falta vale null (un input vacío vale 0).
const TODAS = formula([
  tc('tc'),
  opcion('v'),
  inp('x'),
  campo('a', 'a'),
  campo('b', 'b'),
  campo('c', 'c'),
  cmp('mayor', ['a', 'b'], '>'),
  cmp('menor', ['a', 'b'], '<'),
  cmp('mayor_igual', ['a', 'b'], '>='),
  cmp('menor_igual', ['a', 'b'], '<='),
  cmp('igual', ['a', 'b'], '='),
  cmp('distinto', ['a', 'b'], '<>'),
  calc('es_a', 'es_opcion', ['v'], { cmp: '=', clave: 'a', ...raw }),
  calc('no_es_a', 'es_opcion', ['v'], { cmp: '<>', clave: 'a', ...raw }),
  calc('ambos', 'y', ['mayor', 'es_a', 'distinto'], raw),
  calc('alguno', 'o', ['igual', 'no_es_a'], raw),
  calc('rama', 'elegir', ['a', 'b'], { prueba: 'mayor' }),
  calc('sin_otra', 'elegir', ['c'], { prueba: 'alguno' }),
  calc('el_mayor', 'max', ['a', 'b', 'c']),
  calc('el_menor', 'min', ['a', 'b', 'c']),
  total(['x'], { bucket: 'x' }),
])

const conTodas = (nombre: string, vehiculo: Objeto, variante?: string): CasoAMano =>
  caso(
    'borde',
    nombre,
    TODAS,
    entrada({ inputs: { x: 1 }, vehiculo, ...(variante === undefined ? {} : { variante }) }),
  )

const sv = (nombre: string, nodos: Objeto[], e: Json = entrada()): CasoAMano =>
  caso('sin_validar', nombre, formula([tc('tc'), ...nodos, total(['x'], { bucket: 'x' })]), e)

export const CASOS_DE_CONDICIONES: CasoAMano[] = [
  conTodas('condiciones: a mayor que b', { a: 3, b: 2, c: 1 }),
  conTodas('condiciones: a igual a b, con la otra opción', { a: 2, b: 2, c: 1 }, 'b'),
  conTodas('condiciones: 0,1 + 0,2 frente a 0,3 no es igual', { a: 0.1 + 0.2, b: 0.3, c: 0.3 }),
  conTodas('condiciones: cero negativo frente a cero es igual', { a: -0, b: 0, c: -0 }),
  conTodas('condiciones: el mayor y el menor con negativos y subnormales', {
    a: -5e-324,
    b: 5e-324,
    c: -1e308,
  }),
  conTodas('condiciones: el mayor y el menor repetidos', { a: 7, b: 7, c: 7 }),
  conTodas('condiciones: a null vuelve null lo que lo lee, no lo demás', { b: 2, c: 1 }),
  conTodas('condiciones: c null sólo pesa en la rama que lo elige y en los extremos', {
    a: 1,
    b: 2,
  }),
  conTodas('condiciones: c null en la rama elegida por O', { a: 2, b: 2 }, 'b'),
  // Un `elegir` cuya prueba es una bandera, con la bandera encendida y apagada (una bandera vale 1 o 0).
  caso(
    'borde',
    'condiciones: la prueba de elegir es una bandera encendida',
    formula(
      [
        tc('tc'),
        bandera('nuevo'),
        inp('x'),
        con('k'),
        calc('r', 'elegir', ['x', 'k'], { prueba: 'nuevo' }),
        total(['r'], { bucket: 'x' }),
      ],
      {},
      { k: 9 },
    ),
    entrada({ inputs: { x: 4 }, banderas: { nuevo: true } }),
  ),
  caso(
    'borde',
    'condiciones: la prueba de elegir es una bandera apagada',
    formula(
      [
        tc('tc'),
        bandera('nuevo'),
        inp('x'),
        con('k'),
        calc('r', 'elegir', ['x', 'k'], { prueba: 'nuevo' }),
        total(['r'], { bucket: 'x' }),
      ],
      {},
      { k: 9 },
    ),
    entrada({ inputs: { x: 4 } }),
  ),
  // Lo que lanza: leer la variante como un número, comparar algo que no es la variante y leer algo posterior.
  sv('condiciones: comparar lee la variante', [opcion('v'), inp('x'), cmp('c', ['x', 'v'], '>')]),
  sv('condiciones: MAX lee la variante', [opcion('v'), inp('x'), calc('m', 'max', ['v', 'x'])]),
  sv('condiciones: Y lee la variante', [opcion('v'), inp('x'), calc('m', 'y', ['x', 'v'], raw)]),
  sv('condiciones: elegir prueba la variante', [
    opcion('v'),
    inp('x'),
    calc('m', 'elegir', ['x'], { prueba: 'v' }),
  ]),
  sv('condiciones: elegir toma la variante como rama', [
    opcion('v'),
    inp('x'),
    calc('m', 'elegir', ['x', 'v'], { prueba: 'x' }),
  ]),
  sv('condiciones: es_opcion compara un número', [
    inp('x'),
    calc('e', 'es_opcion', ['x'], { cmp: '=', clave: 'a', ...raw }),
  ]),
  sv('condiciones: es_opcion lee algo posterior', [
    inp('x'),
    calc('e', 'es_opcion', ['v'], { cmp: '=', clave: 'a', ...raw }),
    opcion('v'),
  ]),
  sv('condiciones: elegir lee una rama posterior', [
    inp('x'),
    calc('e', 'elegir', ['x', 'despues'], { prueba: 'x' }),
    inp('despues'),
  ]),
  sv('condiciones: comparar lee un nodo que no existe', [inp('x'), cmp('c', ['x', 'no_hay'], '=')]),
]
