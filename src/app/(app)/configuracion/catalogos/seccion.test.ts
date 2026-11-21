import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import { conSubseccionesVisibles, primeraSubseccionAbierta } from '../secciones'
import { SECCION_DE_CATALOGOS } from './seccion'

const con = (...claves: ClavePermiso[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' as const }))

const APP = path.join(process.cwd(), 'src/app/(app)')

describe('la sección Catálogos de Configuración', () => {
  it('es de Operación, con su ruta, y no tiene página propia sino su route.ts', () => {
    expect(SECCION_DE_CATALOGOS.grupo).toBe('operacion')
    expect(SECCION_DE_CATALOGOS.ruta).toBe('/configuracion/catalogos')
    expect(existsSync(path.join(APP, 'configuracion/catalogos/route.ts'))).toBe(true)
  })

  it('tres tramos: Cotizaciones, Logística y Tablas compartidas sin rótulo', () => {
    expect(
      SECCION_DE_CATALOGOS.subsecciones.map((sub) => [sub.titulo, sub.ruta, sub.grupo ?? null]),
    ).toEqual([
      ['Colores', '/configuracion/catalogos/colores', 'Cotizaciones'],
      ['Niveles', '/configuracion/catalogos/niveles', 'Cotizaciones'],
      ['Quién crea y quién ve', '/configuracion/catalogos/quien-crea-y-quien-ve', 'Cotizaciones'],
      ['Vigencia', '/configuracion/catalogos/vigencia', 'Cotizaciones'],
      ['Puertos', '/configuracion/catalogos/puertos', 'Logística'],
      ['Navieras', '/configuracion/catalogos/navieras', 'Logística'],
      ['Categorías de gasto', '/configuracion/catalogos/categorias-de-gasto', 'Logística'],
      ['Tipos de documento', '/configuracion/catalogos/tipos-de-documento', 'Logística'],
      ['Tablas compartidas', '/configuracion/catalogos/tablas', null],
    ])
  })

  it('cada catálogo lleva a una página que existe', () => {
    for (const sub of SECCION_DE_CATALOGOS.subsecciones) {
      expect(existsSync(path.join(APP, sub.ruta, 'page.tsx')), sub.clave).toBe(true)
    }
  })

  it('se abre con cualquiera de los permisos de sus catálogos', () => {
    expect([...SECCION_DE_CATALOGOS.permisos].sort()).toEqual([
      'cotizaciones.configurar',
      'equipo.roles.gestionar',
      'equipo.roles.ver',
      'flujos.configurar',
      'logistica.catalogos.gestionar',
      'repuestos.configurar',
    ])
  })

  it('quien configura la cotización sin ver los roles: Niveles y Quién crea y quién ve apagadas con su motivo', () => {
    const visibles = conSubseccionesVisibles(SECCION_DE_CATALOGOS, con('cotizaciones.configurar'))
    expect(visibles.subsecciones.map((sub) => [sub.clave, sub.apagada ?? false])).toEqual([
      ['colores', false],
      ['niveles', true],
      ['quien-crea-y-quien-ve', true],
      ['vigencia', false],
      ['tablas', false],
    ])
    expect(visibles.subsecciones[1]?.motivoSinPermiso).toBe('Te falta el permiso «Ver roles».')
    expect(visibles.subsecciones[2]?.motivoSinPermiso).toBe('Te falta el permiso «Ver roles».')
  })

  it('quien configura un flujo sólo ve los tipos de documento, y la sección abre ahí', () => {
    const permisos = con('flujos.configurar')
    expect(
      conSubseccionesVisibles(SECCION_DE_CATALOGOS, permisos)
        .subsecciones.filter((sub) => !sub.apagada)
        .map((sub) => sub.clave),
    ).toEqual(['tipos-de-documento'])
    expect(primeraSubseccionAbierta(SECCION_DE_CATALOGOS, permisos)).toBe(
      '/configuracion/catalogos/tipos-de-documento',
    )
  })

  it('quien gestiona los catálogos de logística abre los cuatro de logística, desde Puertos', () => {
    const permisos = con('logistica.catalogos.gestionar')
    expect(primeraSubseccionAbierta(SECCION_DE_CATALOGOS, permisos)).toBe(
      '/configuracion/catalogos/puertos',
    )
    expect(
      conSubseccionesVisibles(SECCION_DE_CATALOGOS, permisos)
        .subsecciones.filter((sub) => !sub.apagada)
        .map((sub) => sub.grupo),
    ).toEqual(['Logística', 'Logística', 'Logística', 'Logística'])
  })

  it('sin permisos, nada que abrir', () => {
    expect(primeraSubseccionAbierta(SECCION_DE_CATALOGOS, [])).toBeNull()
  })
})
