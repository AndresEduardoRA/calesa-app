import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  contextoDeValidacion,
  TOPE_DE_TONOS,
  versionDePlantilla,
  type FormulaParaLaPlantilla,
} from './lectura-de-la-plantilla'
import { TOPE_EN_BYTES_DE_LA_CUADRICULA } from '../cuadricula-de-la-tarjeta'
import { bytesComoJsonb } from '../json-de-la-base'
import { juegoDePlantilla } from './juego-de-plantilla.soporte'

const HORA = '2026-11-07T15:00:00.123456+00:00'
const base = { id: 'a', version: null, nota: null, actualizadoEn: HORA, publicadoEn: null }
const VALIDA = {
  grupos: [{ grupo: 'compra' }],
  total: { etiqueta: 'TOTAL' },
  logo: false,
  columnas: { leyenda: true, plazo: false, tipo_cambio: false },
}

const CUADRICULA = {
  forma: 2,
  columnas: [{ id: 'a', ancho: 100 }],
  filas: [{ id: 'f', alto: 20, ocultar_si: 'nunca' }],
  celdas: [{ id: 'c', fila: 'f', columna: 'a', contenido: { tipo: 'texto', texto: 'Hola' } }],
}

describe('versionDePlantilla', () => {
  it('una forma 1 con la forma: su plantilla, y las horas tal cual', () => {
    const v = versionDePlantilla({ ...base, definicion: VALIDA, version: 3, nota: 'Hola' })
    expect(v).toEqual({
      ...base,
      version: 3,
      nota: 'Hola',
      contenido: { forma: 1, plantilla: VALIDA },
    })
    expect(v.actualizadoEn).toBe(HORA)
  })

  it('una cuadrícula (la forma 2): su cuadrícula, que el editor edita tal cual', () => {
    const v = versionDePlantilla({ ...base, definicion: CUADRICULA })
    expect(v.contenido).toEqual({ forma: 2, cuadricula: CUADRICULA })
  })

  it('una cuadrícula guardada no se vuelve a medir contra los 24 KiB (ya la midió la base)', () => {
    const filas = Array.from({ length: 120 }, (_, i) => ({
      id: `f${String(i)}`,
      alto: 20,
      ocultar_si: 'nunca',
    }))
    const grande = {
      forma: 2,
      columnas: [{ id: 'a', ancho: 100 }],
      filas,
      celdas: filas.map((f, i) => ({
        id: `celda_${String(i)}`,
        fila: f.id,
        columna: 'a',
        contenido: { tipo: 'texto', texto: 'x'.repeat(250) },
      })),
    }
    expect(bytesComoJsonb(grande)).toBeGreaterThan(TOPE_EN_BYTES_DE_LA_CUADRICULA)
    expect(versionDePlantilla({ ...base, definicion: grande }).contenido).toMatchObject({
      forma: 2,
    })
  })

  it('una definición rota: el mensaje del rechazo, en las dos formas', () => {
    expect(
      versionDePlantilla({ ...base, definicion: { ...VALIDA, grupos: 'no' } }).contenido,
    ).toEqual({
      motivo: 'La plantilla no tiene la forma esperada.',
    })
    expect(
      versionDePlantilla({ ...base, definicion: { ...CUADRICULA, filas: [] } }).contenido,
    ).toEqual({
      motivo: 'La plantilla no tiene la forma esperada.',
    })
  })

  it('lo que no es un objeto no lanza', () => {
    for (const definicion of [null, 3, 'x', [], undefined]) {
      expect('motivo' in versionDePlantilla({ ...base, definicion }).contenido).toBe(true)
    }
  })

  it('los casos de forma rota del juego dan un motivo', () => {
    const juego = juegoDePlantilla(
      readFileSync(
        join(dirname(fileURLToPath(import.meta.url)), 'casos-de-plantilla.json'),
        'utf8',
      ),
    )
    const rotos = juego.casos.filter((c) => 'motivo' in c && c.motivo.regla === 'forma')
    expect(rotos.length).toBeGreaterThan(0)
    for (const c of rotos) {
      if (!('motivo' in c)) continue
      const { contenido } = versionDePlantilla({ ...base, definicion: c.plantilla })
      // La forma 2 sin el tope: lo único que una cuadrícula guardada puede pasar es el de bytes (y eso no se vuelve a medir).
      if (!('motivo' in contenido)) expect(c.motivo.donde).toBe('definicion')
    }
  })
})

const FORMULA: FormulaParaLaPlantilla = {
  id: 'f',
  version: 2,
  definicion: { nodos: [] },
  diseno: null,
  visibilidad: { x: 1 },
}

describe('contextoDeValidacion', () => {
  it('sin fórmula no hay contexto', () => {
    expect(contextoDeValidacion(null, [{ clave: 'verde', nombre: 'Verde' }])).toBeNull()
  })

  it('con fórmula: su definición, diseño y visibilidad, y las claves de los tonos', () => {
    const contexto = contextoDeValidacion(FORMULA, [
      { clave: 'verde', nombre: 'Verde' },
      { clave: 'azul', nombre: 'Azul' },
    ])
    expect(contexto).toEqual({
      definicion: FORMULA.definicion,
      diseno: null,
      visibilidad: { x: 1 },
      tonos: ['verde', 'azul'],
    })
  })

  it('sin tonos en el catálogo, la lista está vacía y no nula (con catálogo, un tono ajeno cae)', () => {
    expect(contextoDeValidacion(FORMULA, [])?.tonos).toEqual([])
  })
})

describe('TOPE_DE_TONOS', () => {
  it('es el de la base', () => {
    expect(TOPE_DE_TONOS).toBe(48)
  })
})
