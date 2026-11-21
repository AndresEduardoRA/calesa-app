// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { definicionSql } from '../../../../../scripts/lib/definicion-sql'
import type { ColumnaDeTabla } from '../tabla-de-ayuda'
import {
  normalizarColumnas,
  sinEspaciosEnLosBordes,
  validarColumnas,
  type ColumnaPedida,
} from './validacion-de-columnas'

const col = (clave: unknown, etiqueta: unknown, tipo: unknown = 'numero'): ColumnaPedida => ({
  clave,
  etiqueta,
  tipo,
})

const CASOS: { nombre: string; columnas: ColumnaPedida[]; anteriores?: ColumnaDeTabla[] }[] = [
  { nombre: 'sin columnas', columnas: [] },
  {
    nombre: 'más de 20',
    columnas: Array.from({ length: 21 }, (_, i) => col(`c${i}`, `C ${i}`)),
  },
  { nombre: 'válidas', columnas: [col('pais', 'País', 'texto'), col('anio', 'Año', 'anio')] },
  { nombre: 'clave con mayúscula', columnas: [col('Pais', 'País')] },
  { nombre: 'clave con acento', columnas: [col('país', 'País')] },
  { nombre: 'clave que empieza con número', columnas: [col('1a', 'A')] },
  { nombre: 'clave de 42', columnas: [col('a'.repeat(42), 'A')] },
  { nombre: 'clave de 41', columnas: [col('a'.repeat(41), 'A')] },
  { nombre: 'clave no texto', columnas: [col(3, 'A')] },
  { nombre: 'clave repetida', columnas: [col('a', 'A'), col('a', 'B')] },
  { nombre: 'etiqueta vacía', columnas: [col('a', '')] },
  { nombre: 'etiqueta de espacios', columnas: [col('a', '   ')] },
  { nombre: 'etiqueta con tab (btrim sólo quita espacios)', columnas: [col('a', '\t')] },
  { nombre: 'etiqueta no texto', columnas: [col('a', 5)] },
  { nombre: 'etiqueta de 60 con emoji', columnas: [col('a', '🚗'.repeat(60))] },
  { nombre: 'etiqueta de 61', columnas: [col('a', 'x'.repeat(61))] },
  {
    nombre: 'etiqueta repetida sin distinguir mayúsculas',
    columnas: [col('a', 'Monto'), col('b', ' MONTO ')],
  },
  {
    nombre: 'etiqueta con Ñ y ñ (no ASCII: distintas)',
    columnas: [col('a', 'Ñandú'), col('b', 'ñandú')],
  },
  { nombre: 'tipo otro', columnas: [col('a', 'A', 'moneda')] },
  { nombre: 'tipo no texto', columnas: [col('a', 'A', 1)] },
  {
    nombre: 'tipo de antes que se conserva',
    columnas: [col('a', 'A', 'moneda')],
    anteriores: [{ clave: 'a', etiqueta: 'A', tipo: 'moneda' }],
  },
  {
    nombre: 'tipo de antes en otra clave',
    columnas: [col('b', 'B', 'moneda')],
    anteriores: [{ clave: 'a', etiqueta: 'A', tipo: 'moneda' }],
  },
  { nombre: 'el primer rechazo, columna por columna', columnas: [col('a', ''), col('A', 'B')] },
]

// La base es la fuente: el espejo da el mismo mensaje y el mismo camino (o ninguno) que `_tabla_referencia_columnas_validas()`.
describe('validarColumnas contra _tabla_referencia_columnas_validas() de la base', () => {
  let db: PGlite

  beforeAll(async () => {
    db = new PGlite()
    await db.exec(definicionSql('_tabla_referencia_columnas_validas').texto)
  })

  afterAll(async () => {
    await db.close()
  })

  async function rechazoDeLaBase(columnas: unknown, anteriores?: unknown) {
    try {
      await db.query('select public._tabla_referencia_columnas_validas($1::jsonb, $2::jsonb)', [
        JSON.stringify(columnas),
        anteriores === undefined ? null : JSON.stringify(anteriores),
      ])
      return null
    } catch (error) {
      const e = error as { code?: string; message: string; hint?: string }
      expect(e.code).toBe('22023')
      return { mensaje: e.message, camino: e.hint ?? '' }
    }
  }

  it.each(CASOS)('$nombre', async ({ columnas, anteriores }) => {
    expect(validarColumnas(columnas, anteriores)).toEqual(
      await rechazoDeLaBase(columnas, anteriores),
    )
  })
})

describe('validarColumnas', () => {
  it('dice la columna y el campo del primer rechazo', () => {
    expect(validarColumnas([col('a', 'A'), col('b', '')])).toEqual({
      mensaje: 'La columna 2: le falta el nombre.',
      camino: 'columnas.1.etiqueta',
    })
  })
})

describe('sinEspaciosEnLosBordes', () => {
  it('quita sólo el espacio ASCII, como btrim(x, " ")', () => {
    expect(sinEspaciosEnLosBordes('  a b  ')).toBe('a b')
    expect(sinEspaciosEnLosBordes('\ta\t')).toBe('\ta\t')
  })
})

describe('normalizarColumnas', () => {
  it('deja clave, etiqueta sin espacios en los bordes y tipo', () => {
    expect(
      normalizarColumnas([
        { clave: 'a', etiqueta: ' A ', tipo: 'numero', extra: 1 } as ColumnaDeTabla,
      ]),
    ).toEqual([{ clave: 'a', etiqueta: 'A', tipo: 'numero' }])
  })
})
