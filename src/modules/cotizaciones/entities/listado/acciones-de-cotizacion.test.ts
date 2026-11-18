import { describe, expect, it } from 'vitest'
import type { Concesion, Permisos } from '@/shared/lib/permisos'
import {
  BLOQUES_DEL_MENU_DE_COTIZACION,
  ETIQUETA_DE_ACCION_DE_COTIZACION,
  accionesDeCotizacion,
  puedeGuardarDesdeElListado,
  type ClaveDeAccionDeCotizacion,
} from './acciones-de-cotizacion'

const ORIGEN = '0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const OTRO = '1c8b3a1f-2d3e-4f60-9bac-1d2e3f4a5b6c'
const YO = '2d9c4b20-3e4f-4071-8cbd-2e3f4a5b6c7d'
const AJENA = '3eadc531-4f50-4182-9dce-3f4a5b6c7d8e'

const concesion = (
  clave: Concesion['clave'],
  origenId: string | null,
  alcance: Concesion['alcance'] = 'todos',
): Concesion => ({ clave, origenId, alcance })

describe('accionesDeCotizacion', () => {
  const todas = Object.fromEntries(
    Object.keys(ETIQUETA_DE_ACCION_DE_COTIZACION).map((clave) => [clave, { motivo: null }]),
  )

  it('con todo ofrecido, los bloques y su orden son los de la lista única', () => {
    expect(accionesDeCotizacion(todas)).toEqual(BLOQUES_DEL_MENU_DE_COTIZACION)
    expect(BLOQUES_DEL_MENU_DE_COTIZACION.flat().toSorted()).toEqual(
      (Object.keys(ETIQUETA_DE_ACCION_DE_COTIZACION) as ClaveDeAccionDeCotizacion[]).toSorted(),
    )
  })

  it('compartir va primero y solo', () => {
    expect(BLOQUES_DEL_MENU_DE_COTIZACION[0]).toEqual(['compartir'])
    expect(ETIQUETA_DE_ACCION_DE_COTIZACION.compartir).toBe('Compartir cotización…')
  })

  it('lo destructivo va al final y solo', () => {
    expect(BLOQUES_DEL_MENU_DE_COTIZACION.at(-1)).toEqual(['papelera'])
  })

  it('lo que no se ofrece no aparece, y un bloque sin nada desaparece', () => {
    expect(
      accionesDeCotizacion({ favorita: { motivo: null }, reportar: { motivo: null } }),
    ).toEqual([['favorita', 'reportar']])
    expect(accionesDeCotizacion({})).toEqual([])
  })

  it('una apagada (con motivo) sigue en su lugar: la oferta dice por qué', () => {
    expect(
      accionesDeCotizacion({ aprobar: { motivo: 'Para aprobarla, asígnale un vehículo.' } }),
    ).toEqual([['aprobar']])
  })
})

describe('puedeGuardarDesdeElListado', () => {
  const preventa = { clase: 'preventa' as const, origenId: ORIGEN, creadoPor: YO }

  it('una preventa: editar de todos, o de propios si es suya', () => {
    const todos: Permisos = [concesion('cotizaciones.editar', ORIGEN, 'todos')]
    const propios: Permisos = [concesion('cotizaciones.editar', ORIGEN, 'propios')]
    expect(puedeGuardarDesdeElListado({ ...preventa, creadoPor: AJENA }, todos, YO)).toBe(true)
    expect(puedeGuardarDesdeElListado(preventa, propios, YO)).toBe(true)
    expect(puedeGuardarDesdeElListado({ ...preventa, creadoPor: AJENA }, propios, YO)).toBe(false)
  })

  it('sin editar en su origen, no', () => {
    expect(puedeGuardarDesdeElListado(preventa, [concesion('cotizaciones.editar', OTRO)], YO)).toBe(
      false,
    )
    expect(puedeGuardarDesdeElListado(preventa, [], YO)).toBe(false)
  })

  it('una final pide gestionar finales en su origen, aunque pueda editar', () => {
    const final = { ...preventa, clase: 'final' as const }
    expect(puedeGuardarDesdeElListado(final, [concesion('cotizaciones.editar', null)], YO)).toBe(
      false,
    )
    expect(
      puedeGuardarDesdeElListado(final, [concesion('cotizaciones.final.gestionar', ORIGEN)], YO),
    ).toBe(true)
  })
})
