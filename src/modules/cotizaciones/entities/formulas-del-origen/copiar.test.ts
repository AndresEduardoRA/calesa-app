import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  motivoDeLaPieza,
  nombreDeLaCopia,
  origenesParaCopiar,
  piezaParaCopiarDeOtro,
} from './copiar'

const A = 'a'
const B = 'b'
const C = 'c'

describe('origenesParaCopiar', () => {
  it('los que configura, sin el abierto', () => {
    const permisos: Permisos = [
      { clave: 'cotizaciones.configurar', origenId: A, alcance: 'todos' },
      { clave: 'cotizaciones.configurar', origenId: B, alcance: 'todos' },
      { clave: 'cotizaciones.ver', origenId: C, alcance: 'todos' },
    ]
    const origenes = [A, B, C].map((id) => ({ id, nombre: id.toUpperCase() }))
    expect(origenesParaCopiar(origenes, permisos, A)).toEqual([{ id: B, nombre: 'B' }])
  })

  it('con el permiso en todos, todos menos el abierto', () => {
    const permisos: Permisos = [
      { clave: 'cotizaciones.configurar', origenId: null, alcance: 'todos' },
    ]
    expect(origenesParaCopiar([{ id: A }, { id: C }], permisos, A)).toEqual([{ id: C }])
  })
})

describe('nombreDeLaCopia', () => {
  it('suma «(copia)» y recorta a 60 caracteres', () => {
    expect(nombreDeLaCopia(' Flete ')).toBe('Flete (copia)')
    const largo = 'x'.repeat(60)
    const copia = nombreDeLaCopia(largo)
    expect([...copia]).toHaveLength(60)
    expect(copia.endsWith(' (copia)')).toBe(true)
  })
})

describe('piezaParaCopiarDeOtro y motivoDeLaPieza', () => {
  const P = { id: 'p', version: 1 }
  const B1 = { id: 'b', actualizadoEn: 'h' }
  it('la publicada si la hay; si no, el borrador; si no, nada', () => {
    expect(piezaParaCopiarDeOtro({ formula: { publicada: P, borrador: B1 } })).toBe('publicada')
    expect(piezaParaCopiarDeOtro({ formula: { publicada: null, borrador: B1 } })).toBe('borrador')
    expect(piezaParaCopiarDeOtro({ formula: { publicada: null, borrador: null } })).toBeNull()
  })

  it('dice por qué no se copia la versión que no existe', () => {
    const soloBorrador = { formula: { publicada: null, borrador: B1 } }
    expect(motivoDeLaPieza(soloBorrador, 'publicada')).toBe(
      'Esa fórmula no tiene versión publicada.',
    )
    expect(motivoDeLaPieza(soloBorrador, 'borrador')).toBeNull()
    expect(motivoDeLaPieza({ formula: { publicada: P, borrador: null } }, 'borrador')).toBe(
      'Esa fórmula no tiene borrador.',
    )
  })
})
