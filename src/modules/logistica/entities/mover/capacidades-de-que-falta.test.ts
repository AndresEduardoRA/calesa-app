import { describe, expect, it } from 'vitest'
import type { Concesion, Permisos } from '@/shared/lib/permisos'
import { capacidadesDeQueFalta } from './capacidades-de-que-falta'

const ORIGEN = '00000000-0000-4000-8000-0000000000c1'
const OTRO = '00000000-0000-4000-8000-0000000000c2'

const de = (clave: Concesion['clave'], origenId: string | null = null): Concesion => ({
  clave,
  origenId,
  alcance: 'todos',
})

describe('capacidades de «Qué falta»', () => {
  it('las claves por origen cuentan sólo en el de la unidad', () => {
    const permisos: Permisos = [
      de('logistica.ver', ORIGEN),
      de('logistica.documentos.subir', OTRO),
      de('logistica.transporte.editar', ORIGEN),
    ]
    const c = capacidadesDeQueFalta(permisos, { tipo: 'vehiculo', origenId: ORIGEN })
    expect(c.subirDocumentos).toBe(false)
    expect(c.editarTransporte).toBe(true)
    expect(c.veHueco.documentos).toBe(true)
    expect(c.veHueco.pagos).toBe(false)
  })

  it('las globales valen en todo origen', () => {
    const permisos: Permisos = [
      de('logistica.pagos.confirmar'),
      de('agenda.tareas.asignar'),
      de('repuestos.ver'),
      de('repuestos.mover'),
    ]
    const c = capacidadesDeQueFalta(permisos, { tipo: 'vehiculo', origenId: ORIGEN })
    expect(c.confirmarPagos).toBe(true)
    expect(c.asignarTareas).toBe(true)
    expect(c.moverRepuestos).toBe(true)
    expect(c.veHueco.repuestos).toBe(true)
    expect(c.verLogistica).toBe(false)
  })

  it('un ítem mira sus claves de repuestos y ninguna de vehículo', () => {
    const permisos: Permisos = [
      de('repuestos.ver'),
      de('repuestos.documentos.aprobar'),
      de('logistica.documentos.subir', ORIGEN),
      de('logistica.ver', OTRO),
    ]
    const c = capacidadesDeQueFalta(permisos, { tipo: 'repuesto', origenId: null })
    expect(c.tipo).toBe('repuesto')
    expect(c.aprobarDocumentos).toBe(true)
    expect(c.subirDocumentos).toBe(false)
    expect(c.veHueco).toEqual({
      documentos: true,
      transporte: false,
      aduana: false,
      pagos: false,
      repuestos: false,
    })
    // «Ir al vehículo»: `logistica.ver` en cualquier origen.
    expect(c.verLogistica).toBe(true)
  })
})
