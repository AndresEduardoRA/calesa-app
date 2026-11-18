import { describe, expect, it } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import { eleccionesDeLaHoja, obligatoriosAlCotizar } from './obligatorios-por-rol'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const PANELES = { cliente: 'cliente', vehiculo: 'vehiculo' }

const permisos = (...claves: [ClavePermiso, string | null][]): Permisos =>
  claves.map(([clave, origenId]) => ({ clave, origenId, alcance: 'todos' as const }))

describe('obligatoriosAlCotizar', () => {
  it('sin las claves, los dos son obligatorios', () => {
    expect(obligatoriosAlCotizar(permisos(['cotizaciones.crear', null]), A)).toStrictEqual({
      lead: true,
      vehiculo: true,
    })
  })

  it('cada clave libera lo suyo: la del vehículo no libera el lead, ni al revés', () => {
    expect(
      obligatoriosAlCotizar(permisos(['cotizaciones.crear.sin_vehiculo', null]), A),
    ).toStrictEqual({ lead: true, vehiculo: false })
    expect(obligatoriosAlCotizar(permisos(['cotizaciones.crear.sin_lead', null]), A)).toStrictEqual(
      { lead: false, vehiculo: true },
    )
    expect(
      obligatoriosAlCotizar(
        permisos(['cotizaciones.crear.sin_lead', null], ['cotizaciones.crear.sin_vehiculo', null]),
        A,
      ),
    ).toStrictEqual({ lead: false, vehiculo: false })
  })

  it('la clave de otro origen no vale en éste, y la de éste sí', () => {
    const enB = permisos(['cotizaciones.crear.sin_lead', B], ['cotizaciones.crear.sin_vehiculo', B])
    expect(obligatoriosAlCotizar(enB, A)).toStrictEqual({ lead: true, vehiculo: true })
    expect(obligatoriosAlCotizar(enB, B)).toStrictEqual({ lead: false, vehiculo: false })
  })

  it('«Ver como» un rol sin la clave: la perspectiva (un subconjunto de los permisos) pide lo que pide ese rol', () => {
    const perspectiva = permisos(['cotizaciones.crear', null], ['cotizaciones.ver', null])
    expect(obligatoriosAlCotizar(perspectiva, A)).toStrictEqual({ lead: true, vehiculo: true })
  })
})

describe('eleccionesDeLaHoja', () => {
  it('con leads.ver y vehiculos.ver del origen, el botón abre el panel de cada uno', () => {
    expect(
      eleccionesDeLaHoja(permisos(['leads.ver', null], ['vehiculos.ver', null]), A, PANELES),
    ).toStrictEqual({
      lead: { panel: 'cliente' },
      vehiculo: { panel: 'vehiculo' },
      titulo: { panel: 'vehiculo' },
    })
  })

  it('sin leads.ver, o sin vehiculos.ver de ese origen, el pedido a quien administra los roles', () => {
    expect(eleccionesDeLaHoja(permisos(['vehiculos.ver', B]), A, PANELES)).toStrictEqual({
      lead: { pedido: 'Para elegir el cliente, pídeselo a quien administra los roles.' },
      vehiculo: { pedido: 'Para elegir el vehículo, pídeselo a quien administra los roles.' },
      // El título se escribe igual: el panel del vehículo abre sólo con su campo.
      titulo: { panel: 'vehiculo' },
    })
  })
})
