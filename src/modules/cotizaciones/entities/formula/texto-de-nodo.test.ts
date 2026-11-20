import { describe, expect, it } from 'vitest'
import { formulaDe, SEMILLAS, type Clave } from '../semilla-lectura'
import { mismaEstructura } from './misma-estructura'
import { compilarFila } from './compilar-fila'
import { NODOS_DE_BASE, formulaCruda, idsDe, nodoDe } from './fila-de-prueba.soporte'
import { textoDeNodo } from './texto-de-nodo'

const BASE = [
  ...NODOS_DE_BASE,
  { id: 'tasa', tipo: 'constante', etiqueta: 'Tasa', formato: 'pct' },
  { id: 'plano', tipo: 'constante', etiqueta: 'Plano', formato: 'usd' },
  { id: 'negativa', tipo: 'constante', etiqueta: 'Negativa', formato: 'raw' },
  {
    id: 'variante',
    tipo: 'opcion',
    etiqueta: 'Variante',
    opciones: [
      { clave: 'a', etiqueta: 'A', titulo: 'Opción A' },
      { clave: 'b', etiqueta: 'B', titulo: 'Opción B' },
    ],
  },
  {
    id: 'mayor',
    tipo: 'calculo',
    op: 'comparar',
    de: ['remate', 'fees'],
    cmp: '>',
    etiqueta: 'Mayor',
    formato: 'raw',
  },
]
const PARAMS = { tasa: 0.04, plano: 900, negativa: -3 }
const con = (...filas: unknown[]) => formulaCruda([...BASE, ...filas], PARAMS)
const calculo = (id: string, resto: Record<string, unknown>) => ({
  id,
  tipo: 'calculo',
  etiqueta: id,
  ...resto,
})

const CASOS: [string, Record<string, unknown>, string][] = [
  ['suma', { op: 'suma', de: ['remate', 'fees'] }, 'remate+fees'],
  ['suma de uno', { op: 'suma', de: ['remate'] }, 'remate'],
  ['restar', { op: 'restar', de: ['remate', 'fees', 'flete'] }, 'remate-fees-flete'],
  ['multiplicar', { op: 'multiplicar', de: ['remate', 'fees'] }, 'remate*fees'],
  ['dividir', { op: 'dividir', de: ['remate', 'fees'] }, 'remate/fees'],
  [
    'porcentaje_de',
    { op: 'porcentaje_de', de: ['remate', 'fees'], pct: 'tasa' },
    'PORCENTAJE_DE(remate+fees; tasa)',
  ],
  [
    'porcentaje_de de uno',
    { op: 'porcentaje_de', de: ['remate'], pct: 'tasa' },
    'PORCENTAJE_DE(remate; tasa)',
  ],
  ['si', { op: 'si', de: ['remate'], condicion: 'b' }, 'SI(b; remate)'],
  ['redondear', { op: 'redondear', de: ['remate'], n: 2 }, 'REDONDEAR(remate; 2)'],
  [
    'depreciar',
    { op: 'depreciar', de: ['remate'], tabla: 'dep', sobre: 'fees', columna: 'tasa_dep' },
    'DEPRECIAR(remate; dep; fees; tasa_dep)',
  ],
  [
    'comparar',
    { op: 'comparar', de: ['remate', 'fees'], cmp: '>=', formato: 'raw' },
    'remate>=fees',
  ],
  [
    'es_opcion',
    { op: 'es_opcion', de: ['variante'], cmp: '<>', clave: 'b', formato: 'raw' },
    'variante<>"b"',
  ],
  ['y', { op: 'y', de: ['b', 'mayor'], formato: 'raw' }, 'Y(b; mayor)'],
  ['o', { op: 'o', de: ['mayor', 'c'], formato: 'raw' }, 'O(mayor; c)'],
  [
    'elegir con «si no»',
    { op: 'elegir', prueba: 'mayor', de: ['remate', 'fees'] },
    'SI(mayor; remate; fees)',
  ],
  ['elegir sin «si no»', { op: 'elegir', prueba: 'mayor', de: ['remate'] }, 'SI(mayor; remate)'],
  ['max', { op: 'max', de: ['remate', 'fees', 'flete'] }, 'MAX(remate; fees; flete)'],
  ['min', { op: 'min', de: ['remate', 'fees'] }, 'MIN(remate; fees)'],
]

describe('textoDeNodo: un texto que recompila al mismo nodo (T11, C11)', () => {
  it.each(CASOS)('%s', (nombre, resto, esperado) => {
    const f = con(calculo('fila', resto))
    expect(textoDeNodo(f, 'fila')).toBe(esperado)
    // Y recompila al mismo nodo, sin auxiliares nuevas.
    const r = compilarFila(f, { destino: { existente: 'fila' }, texto: esperado })
    if (!r.ok) throw new Error(JSON.stringify(r.error))
    const antes = nodoDe(f, 'fila')
    const despues = nodoDe(r.formula, 'fila')
    expect(
      antes &&
        despues &&
        mismaEstructura({ ...antes, texto: 'x' } as never, { ...despues, texto: 'x' } as never),
      nombre,
    ).toBe(true)
    expect(idsDe(r.formula)).toEqual(idsDe(f))
  })

  it('una constante se escribe como su número, con % si es un porcentaje', () => {
    const f = con()
    expect(textoDeNodo(f, 'tasa')).toBe('4%')
    expect(textoDeNodo(f, 'plano')).toBe('900')
  })

  it('una constante negativa no se escribe', () => {
    expect(textoDeNodo(con(), 'negativa')).toBeNull()
  })

  it('un suma cuyo de nombra un nodo posterior da null', () => {
    const f = con(calculo('fila', { op: 'suma', de: ['posterior', 'remate'] }), {
      id: 'posterior',
      tipo: 'input',
      etiqueta: 'P',
    })
    expect(textoDeNodo(f, 'fila')).toBeNull()
  })

  it('un elegir de una bandera sin «si no» se escribiría como el si de siempre: da null', () => {
    const f = con(calculo('fila', { op: 'elegir', prueba: 'b', de: ['remate'] }))
    expect(textoDeNodo(f, 'fila')).toBeNull()
  })

  it('los otros tipos y lo que no existe dan null', () => {
    const f = con()
    for (const id of ['remate', 'tc', 'b', 'no_existe']) expect(textoDeNodo(f, id), id).toBeNull()
  })
})

describe('las tres semillas', () => {
  // Las filas que la gramática no sabe escribir (ninguna hoy): se listan con su motivo.
  const SIN_TEXTO: Record<string, string> = {}
  for (const clave of Object.keys(SEMILLAS) as Clave[]) {
    it(`${clave}: cada fila de cálculo o constante da un texto que recompila al mismo nodo, o está en la lista`, () => {
      const f = formulaDe(clave)
      const filas = f.definicion.nodos.filter((n) => n.tipo === 'calculo' || n.tipo === 'constante')
      expect(filas.length).toBeGreaterThan(0)
      for (const n of filas) {
        const texto = textoDeNodo(f, n.id)
        if (texto === null) {
          expect(
            SIN_TEXTO[`${clave}.${n.id}`],
            `${clave}.${n.id} no tiene texto y no está en la lista`,
          ).toBeDefined()
          continue
        }
        const r = compilarFila(f, { destino: { existente: n.id }, texto })
        if (!r.ok) throw new Error(`${clave}.${n.id}: ${JSON.stringify(r.error)}`)
        expect(idsDe(r.formula), `${clave}.${n.id}`).toEqual(idsDe(f))
        expect(r.formula.params.constantes, `${clave}.${n.id}`).toEqual(f.params.constantes)
        const despues = nodoDe(r.formula, n.id)
        expect(
          despues !== undefined &&
            mismaEstructura({ ...n, texto: 'x' } as never, { ...despues, texto: 'x' } as never),
          `${clave}.${n.id}: ${texto}`,
        ).toBe(true)
      }
    })
  }
})
