import { describe, expect, it } from 'vitest'
import type { ClavePermiso, Concesion, Permisos } from '@/shared/lib/permisos'
import { CLAVES_DE_NUEVO, CATALOGO_DE_NUEVO } from './catalogo'
import { opcionesDeNuevo } from './opciones'

const con = (...claves: ClavePermiso[]): Permisos =>
  claves.map((clave): Concesion => ({ clave, origenId: null, alcance: 'todos' }))
const enUnOrigen = (clave: ClavePermiso): Permisos => [
  { clave, origenId: '00000000-0000-4000-8000-000000000001', alcance: 'todos' },
]

describe('opcionesDeNuevo', () => {
  it('sin permisos queda lo propio de la agenda', () => {
    expect(opcionesDeNuevo(con())).toEqual(['evento', 'tarea'])
  })

  it('cada opción exige su permiso y «Lead» va primero', () => {
    const todos = con(
      'leads.crear',
      'vehiculos.crear',
      'cotizaciones.crear',
      'repuestos.editar',
      'leads.editar',
    )
    expect(opcionesDeNuevo(todos)).toEqual([
      'lead',
      'vehiculo',
      'cotizacion',
      'proyecto',
      'seguimiento',
      'recordatorio',
      'evento',
      'tarea',
    ])
    expect(opcionesDeNuevo(con('leads.crear'))).toEqual(['lead', 'evento', 'tarea'])
    expect(opcionesDeNuevo(con('leads.editar'))).toEqual([
      'seguimiento',
      'recordatorio',
      'evento',
      'tarea',
    ])
    expect(opcionesDeNuevo(con('repuestos.editar'))).toContain('proyecto')
    expect(opcionesDeNuevo(con('cotizaciones.crear'))).toContain('cotizacion')
    expect(opcionesDeNuevo(con('vehiculos.ver', 'leads.ver', 'cotizaciones.ver'))).toEqual([
      'evento',
      'tarea',
    ])
  })

  it('vehículo vale con el permiso en un solo origen', () => {
    expect(opcionesDeNuevo(enUnOrigen('vehiculos.crear'))).toContain('vehiculo')
  })

  it('con sólo el alta desde cotizar, el vehículo se da de alta al cotizar (y pide poder cotizar)', () => {
    expect(opcionesDeNuevo(con('vehiculos.crear.desde_cotizar', 'cotizaciones.crear'))).toEqual([
      'vehiculo-al-cotizar',
      'cotizacion',
      'evento',
      'tarea',
    ])
    expect(opcionesDeNuevo(con('vehiculos.crear.desde_cotizar'))).toEqual(['evento', 'tarea'])
    expect(opcionesDeNuevo(con('vehiculos.crear', 'vehiculos.crear.desde_cotizar'))).not.toContain(
      'vehiculo-al-cotizar',
    )
  })

  it('todas las claves tienen su opción en el catálogo', () => {
    for (const clave of CLAVES_DE_NUEVO) {
      expect(CATALOGO_DE_NUEVO[clave].clave).toBe(clave)
    }
  })
})
