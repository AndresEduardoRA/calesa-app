// Lo que comparten las pruebas de `nodos.ts` y `nodos-referencias.ts`: un nodo de cada tipo y operación, con lo que nombra. Sólo para las pruebas.
import { esquemaNodo, type Nodo } from './nodos'

export const nodo = (x: Record<string, unknown>): Nodo => esquemaNodo.parse({ etiqueta: 'X', ...x })

// Un nodo de cada tipo (y de cada operación) con todo lo que puede nombrar, y lo que tiene que dar.
export const CASOS: [string, Record<string, unknown>, string[]][] = [
  [
    'input',
    { id: 'a', tipo: 'input', sugerido_de: 'b', requerido_si: 'c', condicion: 'd' },
    ['sugerido_de:b', 'requerido_si:c', 'condicion:d'],
  ],
  ['constante', { id: 'a', tipo: 'constante', condicion: 'd' }, ['condicion:d']],
  ['tipo_cambio', { id: 'a', tipo: 'tipo_cambio', clave: 'oficial' }, []],
  ['campo_vehiculo', { id: 'a', tipo: 'campo_vehiculo', campo: 'atributos.cilindrada' }, []],
  ['bandera', { id: 'a', tipo: 'bandera' }, []],
  [
    'opcion',
    {
      id: 'a',
      tipo: 'opcion',
      opciones: [
        { clave: 'x', etiqueta: 'X', titulo: 'X' },
        { clave: 'y', etiqueta: 'Y', titulo: 'Y' },
      ],
    },
    [],
  ],
  [
    'tabla',
    {
      id: 'a',
      tipo: 'tabla',
      tabla: 't',
      match: { anio: 'anio', tipo: 'tipo_vehiculo' },
      columna: 'c',
      condicion: 'd',
    },
    ['match:anio', 'match:tipo_vehiculo', 'condicion:d'],
  ],
  ['tramo', { id: 'a', tipo: 'tramo', tabla: 't', sobre: 'b', columna: 'c' }, ['sobre:b']],
  [
    'suma',
    { id: 'a', tipo: 'calculo', op: 'suma', de: ['b', 'c'], condicion: 'd' },
    ['de:b', 'de:c', 'condicion:d'],
  ],
  [
    'porcentaje_de',
    { id: 'a', tipo: 'calculo', op: 'porcentaje_de', de: ['b'], pct: 'p' },
    ['de:b', 'pct:p'],
  ],
  [
    'multiplicar',
    { id: 'a', tipo: 'calculo', op: 'multiplicar', de: ['b', 'c'] },
    ['de:b', 'de:c'],
  ],
  ['restar', { id: 'a', tipo: 'calculo', op: 'restar', de: ['b', 'c'] }, ['de:b', 'de:c']],
  ['dividir', { id: 'a', tipo: 'calculo', op: 'dividir', de: ['b', 'c'] }, ['de:b', 'de:c']],
  [
    'si',
    { id: 'a', tipo: 'calculo', op: 'si', de: ['b'], condicion: 'd' },
    ['de:b', 'condicion:d'],
  ],
  [
    'depreciar',
    { id: 'a', tipo: 'calculo', op: 'depreciar', de: ['b'], tabla: 't', sobre: 'e', columna: 'c' },
    ['de:b', 'sobre:e'],
  ],
  ['redondear', { id: 'a', tipo: 'calculo', op: 'redondear', de: ['b'], n: 2 }, ['de:b']],
  [
    'comparar',
    { id: 'a', tipo: 'calculo', op: 'comparar', de: ['b', 'c'], cmp: '>=', condicion: 'd' },
    ['de:b', 'de:c', 'condicion:d'],
  ],
  [
    'es_opcion',
    { id: 'a', tipo: 'calculo', op: 'es_opcion', de: ['v'], cmp: '<>', clave: 'x', condicion: 'd' },
    ['variante:v', 'condicion:d'],
  ],
  ['y', { id: 'a', tipo: 'calculo', op: 'y', de: ['b', 'c'] }, ['prueba:b', 'prueba:c']],
  [
    'o',
    { id: 'a', tipo: 'calculo', op: 'o', de: ['b', 'c'], condicion: 'd' },
    ['prueba:b', 'prueba:c', 'condicion:d'],
  ],
  [
    'elegir',
    { id: 'a', tipo: 'calculo', op: 'elegir', de: ['b', 'c'], prueba: 'p', condicion: 'd' },
    ['prueba:p', 'de:b', 'de:c', 'condicion:d'],
  ],
  ['max', { id: 'a', tipo: 'calculo', op: 'max', de: ['b'] }, ['de:b']],
  ['min', { id: 'a', tipo: 'calculo', op: 'min', de: ['b', 'c'] }, ['de:b', 'de:c']],
]
