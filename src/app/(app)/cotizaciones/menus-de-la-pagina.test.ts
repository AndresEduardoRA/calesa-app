import { describe, expect, it, vi } from 'vitest'
import type { Concesion, Permisos } from '@/shared/lib/permisos'

vi.mock('server-only', () => ({}))

import { ofertasDeLaFila } from './menus-de-la-pagina'

const ORIGEN = '0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const OTRO = '1c8b3a1f-2d3e-4f60-9bac-1d2e3f4a5b6c'
const YO = '2d9c4b20-3e4f-4071-8cbd-2e3f4a5b6c7d'
const AJENA = '3eadc531-4f50-4182-9dce-3f4a5b6c7d8e'

const concesion = (
  clave: Concesion['clave'],
  origenId: string | null = null,
  alcance: Concesion['alcance'] = 'todos',
): Concesion => ({ clave, origenId, alcance })

const fila = {
  clase: 'preventa' as 'preventa' | 'final',
  origenId: ORIGEN,
  creadoPor: AJENA,
  vehiculoId: 'veh' as string | null,
  leadId: 'lead' as string | null,
  aprobada: false,
}
const marcas = {
  estado: 'activa' as 'activa' | 'reportada' | 'invalida',
  reportesCount: 0,
  miMotivo: null,
}
const ofrece = (permisos: Permisos, f = fila, m = marcas) =>
  Object.keys(ofertasDeLaFila(f, m, { permisos, usuarioId: YO })).toSorted()

describe('ofertasDeLaFila', () => {
  it('quien sólo ve: compartir, favorita y reportar, nada más', () => {
    expect(ofrece([concesion('cotizaciones.ver', ORIGEN)])).toEqual([
      'compartir',
      'favorita',
      'reportar',
    ])
    expect(ofrece([])).toEqual(['compartir', 'favorita', 'reportar'])
  })

  it('lo que cada clave suma, en el origen de la cotización y no en otro', () => {
    expect(ofrece([concesion('cotizaciones.aprobar', ORIGEN)])).toContain('aprobar')
    expect(ofrece([concesion('cotizaciones.aprobar', OTRO)])).not.toContain('aprobar')
    expect(ofrece([concesion('cotizaciones.final.gestionar', ORIGEN)])).toContain('final')
    expect(ofrece([concesion('cotizaciones.final.gestionar', OTRO)])).not.toContain('final')
    expect(ofrece([concesion('cotizaciones.moderar')])).toEqual(
      expect.arrayContaining(['invalidar', 'papelera']),
    )
  })

  it('una final no se vuelve a marcar, y la ya aprobada no se vuelve a aprobar', () => {
    const permisos = [concesion('cotizaciones.aprobar'), concesion('cotizaciones.final.gestionar')]
    expect(ofrece(permisos, { ...fila, clase: 'final' })).not.toContain('final')
    expect(ofrece(permisos, { ...fila, aprobada: true })).not.toContain('aprobar')
    expect(ofrece(permisos)).toEqual(expect.arrayContaining(['aprobar', 'final']))
  })

  it('moderar: invalidar, y con reportes también descartarlos; una inválida, reactivar', () => {
    const permisos = [concesion('cotizaciones.moderar')]
    expect(ofrece(permisos)).toContain('invalidar')
    expect(ofrece(permisos)).not.toContain('descartar')
    expect(ofrece(permisos, fila, { ...marcas, reportesCount: 2 })).toEqual(
      expect.arrayContaining(['invalidar', 'descartar']),
    )
    const invalida = ofrece(permisos, fila, { ...marcas, estado: 'invalida' })
    expect(invalida).toContain('reactivar')
    expect(invalida).not.toContain('invalidar')
    // En una final, moderar pide gestionar finales del origen.
    expect(ofrece(permisos, { ...fila, clase: 'final' })).not.toContain('invalidar')
    expect(
      ofrece([...permisos, concesion('cotizaciones.final.gestionar', ORIGEN)], {
        ...fila,
        clase: 'final',
      }),
    ).toContain('invalidar')
  })

  it('la papelera: quien edita lo suyo la ve en lo suyo y no en lo ajeno', () => {
    const propios = [concesion('cotizaciones.editar', ORIGEN, 'propios')]
    expect(ofrece(propios, { ...fila, creadoPor: YO })).toContain('papelera')
    expect(ofrece(propios)).not.toContain('papelera')
    expect(ofrece([concesion('cotizaciones.editar', ORIGEN)])).toContain('papelera')
  })

  it('«Aprobar» y «Marcar final» se ven apagadas con su motivo cuando falta lo que piden', () => {
    const permisos = [concesion('cotizaciones.aprobar'), concesion('cotizaciones.final.gestionar')]
    const sinVehiculo = ofertasDeLaFila({ ...fila, vehiculoId: null }, marcas, {
      permisos,
      usuarioId: YO,
    })
    expect(sinVehiculo.aprobar?.motivo).toBe('Para aprobarla, asígnale un vehículo.')
    expect(sinVehiculo.final?.motivo).toMatch(/elige el vehículo|le falta el vehículo/)
    const invalida = ofertasDeLaFila(
      fila,
      { ...marcas, estado: 'invalida' },
      { permisos, usuarioId: YO },
    )
    expect(invalida.aprobar?.motivo).toBe('Una cotización inválida no se aprueba.')
    expect(ofertasDeLaFila(fila, marcas, { permisos, usuarioId: YO }).aprobar?.motivo).toBeNull()
  })
})
