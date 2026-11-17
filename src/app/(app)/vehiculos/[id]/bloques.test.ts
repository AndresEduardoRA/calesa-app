import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Concesion, Permisos } from '@/shared/lib/permisos'
import { BLOQUES_DE_LA_FICHA, anclaDeLaUrl, bloquesDeQuienMira } from './bloques'

const ORIGEN = '00000000-0000-4000-8000-0000000000c1'
const OTRO = '00000000-0000-4000-8000-0000000000c2'

const de = (clave: Concesion['clave'], origenId: string | null = null): Concesion => ({
  clave,
  origenId,
  alcance: 'todos',
})

const anclas = (permisos: Permisos) => bloquesDeQuienMira(permisos, ORIGEN).map((b) => b.ancla)

const TODOS: Permisos = [
  de('logistica.ver', ORIGEN),
  de('leads.ver'),
  de('cotizaciones.ver', ORIGEN),
  de('repuestos.ver'),
]

describe('los bloques de la ficha de un vehículo', () => {
  it('con todo, todos en el orden del índice', () => {
    expect(anclas(TODOS)).toEqual([
      'fase',
      'relacionados',
      'cotizaciones',
      'documentos',
      'ficha',
      'repuestos',
      'fotos',
    ])
    expect(BLOQUES_DE_LA_FICHA.map((b) => b.ancla)).toEqual(anclas(TODOS))
  })

  it('sin nada, «Ficha» y «Fotos»: el índice nunca queda vacío', () => {
    expect(anclas([])).toEqual(['ficha', 'fotos'])
  })

  it('cada bloque por su permiso, solo', () => {
    expect(anclas([de('logistica.ver', ORIGEN)])).toEqual(['fase', 'documentos', 'ficha', 'fotos'])
    expect(anclas([de('leads.ver')])).toEqual(['relacionados', 'ficha', 'fotos'])
    expect(anclas([de('cotizaciones.ver', ORIGEN)])).toEqual(['cotizaciones', 'ficha', 'fotos'])
    expect(anclas([de('repuestos.ver')])).toEqual(['ficha', 'repuestos', 'fotos'])
  })

  it('las claves por origen cuentan sólo en el del vehículo', () => {
    expect(anclas([de('logistica.ver', OTRO), de('cotizaciones.ver', OTRO)])).toEqual([
      'ficha',
      'fotos',
    ])
  })

  it('combinados, sin el que falta', () => {
    expect(anclas(TODOS.filter((c) => c.clave !== 'logistica.ver'))).toEqual([
      'relacionados',
      'cotizaciones',
      'ficha',
      'repuestos',
      'fotos',
    ])
  })

  it('el título del bloque de la fase es «Fase y qué falta» y su etiqueta, «Qué falta»', () => {
    expect(BLOQUES_DE_LA_FICHA[0]).toEqual({
      ancla: 'fase',
      etiqueta: 'Qué falta',
      titulo: 'Fase y qué falta',
    })
  })

  it('los bloques que leen en el servidor tienen su archivo', () => {
    for (const ancla of ['fase', 'documentos', 'repuestos', 'fotos']) {
      expect(existsSync(`src/app/(app)/vehiculos/[id]/bloque-${ancla}.tsx`), ancla).toBe(true)
    }
  })
})

describe('a qué bloque lleva la URL', () => {
  const visibles = bloquesDeQuienMira(TODOS, ORIGEN)
  const url = (cambios: Partial<Parameters<typeof anclaDeLaUrl>[0]>) => ({
    seccion: undefined,
    panel: undefined,
    relacionados: undefined,
    ...cambios,
  })

  it('cada `?seccion=` de siempre, a su bloque', () => {
    for (const seccion of ['ficha', 'fotos', 'documentos', 'cotizaciones', 'repuestos']) {
      expect(anclaDeLaUrl(url({ seccion }), visibles)).toBe(seccion)
    }
  })

  it('una sección sin permiso o que no existe: arriba de todo', () => {
    const sinCotizaciones = bloquesDeQuienMira([de('leads.ver')], ORIGEN)
    expect(anclaDeLaUrl(url({ seccion: 'cotizaciones' }), sinCotizaciones)).toBeNull()
    expect(anclaDeLaUrl(url({ seccion: 'basura' }), visibles)).toBeNull()
    expect(anclaDeLaUrl(url({}), visibles)).toBeNull()
  })

  it('los paneles de «Relacionados» y `?relacionados=` llevan a «Relacionados»', () => {
    for (const panel of ['desvincular', 'vincular-lead', 'marcar-interesado']) {
      expect(anclaDeLaUrl(url({ panel }), visibles)).toBe('relacionados')
    }
    expect(anclaDeLaUrl(url({ relacionados: 'interesado' }), visibles)).toBe('relacionados')
    expect(anclaDeLaUrl(url({ panel: 'vitrina' }), visibles)).toBeNull()
    expect(anclaDeLaUrl(url({ panel: 'desvincular' }), bloquesDeQuienMira([], ORIGEN))).toBeNull()
  })

  it('`seccion` gana a `panel`', () => {
    expect(anclaDeLaUrl(url({ seccion: 'fotos', panel: 'desvincular' }), visibles)).toBe('fotos')
  })
})
