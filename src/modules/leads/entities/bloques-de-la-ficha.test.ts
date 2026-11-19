import { describe, expect, it } from 'vitest'
import {
  ANCLA_DEL_PORTAL,
  anclaDeLaSeccion,
  bloqueDeLaFicha,
  bloquesDelIndice,
  BLOQUES_DE_LA_FICHA,
} from './bloques-de-la-ficha'
import type { LoQueVe } from './ficha'

const todo: LoQueVe = { vehiculos: true, oportunidades: true, cotizaciones: true, portal: true }
const nada: LoQueVe = { vehiculos: false, oportunidades: false, cotizaciones: false, portal: false }
const anclas = (ve: LoQueVe) => bloquesDelIndice(ve).map((bloque) => bloque.ancla)

describe('bloquesDelIndice', () => {
  it('con todos los permisos, los cuatro bloques en el orden de uso (el portal va en la izquierda)', () => {
    expect(anclas(todo)).toEqual(['seguimientos', 'cotizaciones', 'relacionados', 'oportunidades'])
    expect(anclas(todo)).not.toContain(ANCLA_DEL_PORTAL)
  })

  it('sin permisos ni cartera, sólo «Seguimiento»', () => {
    expect(anclas(nada)).toEqual(['seguimientos'])
  })

  it('cada bloque aparece sólo con lo suyo', () => {
    expect(anclas({ ...nada, vehiculos: true })).toEqual(['seguimientos', 'relacionados'])
    expect(anclas({ ...nada, oportunidades: true })).toEqual(['seguimientos', 'oportunidades'])
    expect(anclas({ ...nada, cotizaciones: true })).toEqual(['seguimientos', 'cotizaciones'])
    // El portal no suma nada al índice.
    expect(anclas({ ...nada, portal: true })).toEqual(['seguimientos'])
  })

  it('sin `cotizaciones.ver`, sin `vehiculos.ver` y fuera de la cartera', () => {
    expect(anclas({ ...todo, cotizaciones: false })).toEqual([
      'seguimientos',
      'relacionados',
      'oportunidades',
    ])
    expect(anclas({ ...todo, vehiculos: false })).toEqual([
      'seguimientos',
      'cotizaciones',
      'oportunidades',
    ])
    expect(anclas({ ...todo, oportunidades: false })).toEqual([
      'seguimientos',
      'cotizaciones',
      'relacionados',
    ])
  })

  it('lo que dice el índice: «Seguimiento, Cotizaciones, Vehículos, Oportunidades»', () => {
    expect(bloquesDelIndice(todo).map((bloque) => bloque.etiqueta)).toEqual([
      'Seguimiento',
      'Cotizaciones',
      'Vehículos',
      'Oportunidades',
    ])
    expect(bloqueDeLaFicha('relacionados').titulo).toBe('Vehículos')
  })
})

describe('anclaDeLaSeccion', () => {
  it('«Datos» es el principio: no salta a ningún bloque', () => {
    expect(anclaDeLaSeccion('datos')).toBeNull()
  })

  it('`?seccion=vehiculos` lleva al bloque «Vehículos» (ancla `relacionados`)', () => {
    expect(anclaDeLaSeccion('vehiculos')).toBe('relacionados')
  })

  it('las demás llevan a su bloque', () => {
    expect(anclaDeLaSeccion('seguimientos')).toBe('seguimientos')
    expect(anclaDeLaSeccion('oportunidades')).toBe('oportunidades')
    expect(anclaDeLaSeccion('cotizaciones')).toBe('cotizaciones')
    expect(anclaDeLaSeccion('portal')).toBe(ANCLA_DEL_PORTAL)
  })
})

describe('bloqueDeLaFicha', () => {
  it('da el bloque de cada ancla', () => {
    for (const bloque of BLOQUES_DE_LA_FICHA) {
      expect(bloqueDeLaFicha(bloque.ancla)).toBe(bloque)
    }
  })
})
