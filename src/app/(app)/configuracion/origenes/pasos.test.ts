import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { DESTINOS_DE_PASO, conDestino } from './pasos'

const APP = path.join(process.cwd(), 'src/app/(app)')

describe('destinos de los siguientes pasos', () => {
  it('cada paso con enlace lleva a una pantalla que existe', () => {
    for (const [clave, destino] of Object.entries(DESTINOS_DE_PASO)) {
      if (destino.ruta === null) {
        continue
      }
      const sinParametros = destino.ruta.split('?')[0] ?? ''
      expect(existsSync(path.join(APP, sinParametros, 'page.tsx')), clave).toBe(true)
    }
  })

  it('el flujo lleva a su pantalla y la fórmula a Cotización › Fórmula', () => {
    expect(DESTINOS_DE_PASO.flujo.ruta).toBe('/configuracion/flujos')
    expect(DESTINOS_DE_PASO.formula.ruta).toBe('/configuracion/cotizacion?seccion=formula')
  })
})

describe('conDestino', () => {
  const ORIGEN = '00000000-0000-4000-8000-000000000001'
  const OTRO = '00000000-0000-4000-8000-000000000002'
  const pasos = [
    { clave: 'permisos', titulo: 'x', detalle: 'y', pendiente: true },
    { clave: 'flujo', titulo: 'x', detalle: 'y', pendiente: true },
    { clave: 'formula', titulo: 'x', detalle: 'y', pendiente: true },
  ] as const
  const configura = (origenId: string | null): Permisos => [
    { clave: 'flujos.configurar', origenId, alcance: 'todos' },
  ]

  it('sin el permiso, el paso con enlace dice por qué no se puede', () => {
    const [permisos, flujo, formula] = conDestino(pasos, [], ORIGEN)
    expect(permisos?.motivoDeshabilitado).toContain('Gestionar roles')
    expect(flujo?.motivoDeshabilitado).toContain('Configurar el flujo')
    expect(formula?.motivoDeshabilitado).toContain('Configurar el cotizador')
  })

  it('con el permiso, el enlace queda habilitado', () => {
    const gestiona: Permisos = [
      { clave: 'equipo.roles.gestionar', origenId: null, alcance: 'todos' },
    ]
    const [permisos] = conDestino(pasos, gestiona, ORIGEN)
    expect(permisos?.ruta).toBe('/configuracion/roles')
    expect(permisos?.motivoDeshabilitado).toBeNull()
  })

  it('el enlace del flujo lleva el origen en la URL', () => {
    const [, flujo] = conDestino(pasos, configura(null), ORIGEN)
    expect(flujo?.ruta).toBe(`/configuracion/flujos?origen=${ORIGEN}`)
    expect(flujo?.motivoDeshabilitado).toBeNull()
  })

  it('configurar el flujo de otro origen no habilita el de éste; el de éste, sí', () => {
    expect(conDestino(pasos, configura(OTRO), ORIGEN)[1]?.motivoDeshabilitado).toContain(
      'Configurar el flujo',
    )
    expect(conDestino(pasos, configura(ORIGEN), ORIGEN)[1]?.motivoDeshabilitado).toBeNull()
  })

  it('la fórmula lleva a Cotización › Fórmula con su origen, y se mira el permiso en él', () => {
    const cotiza = (origenId: string | null): Permisos => [
      { clave: 'cotizaciones.configurar', origenId, alcance: 'todos' },
    ]
    const formula = conDestino(pasos, cotiza(ORIGEN), ORIGEN)[2]
    expect(formula?.ruta).toBe(`/configuracion/cotizacion?seccion=formula&origen=${ORIGEN}`)
    expect(formula?.motivoDeshabilitado).toBeNull()
    expect(conDestino(pasos, cotiza(OTRO), ORIGEN)[2]?.motivoDeshabilitado).toContain(
      'Configurar el cotizador',
    )
  })
})
