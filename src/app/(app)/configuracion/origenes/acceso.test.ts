import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  pestanasDelOrigen,
  primeraPestanaAbierta,
  puedeAbrirElOrigen,
  puedeAbrirLaPestana,
  puedeAbrirOrigenes,
} from './acceso'

const A = '00000000-0000-4000-8000-00000000000a'
const B = '00000000-0000-4000-8000-00000000000b'

const con = (clave: string, origenId: string | null = null): Permisos =>
  [{ clave, origenId, alcance: 'todos' }] as Permisos

describe('puedeAbrirOrigenes', () => {
  it('abre quien gestiona orígenes o configura el flujo o la fórmula de alguno', () => {
    expect(puedeAbrirOrigenes(con('origenes.gestionar'))).toBe(true)
    expect(puedeAbrirOrigenes(con('flujos.configurar', A))).toBe(true)
    expect(puedeAbrirOrigenes(con('cotizaciones.configurar'))).toBe(true)
  })

  it('una asesora sin esos permisos no entra', () => {
    expect(puedeAbrirOrigenes(con('leads.ver'))).toBe(false)
    expect(puedeAbrirOrigenes([])).toBe(false)
  })
})

describe('puedeAbrirElOrigen', () => {
  it('se mira en el origen: el permiso en otro no alcanza; uno sin origen, sí', () => {
    expect(puedeAbrirElOrigen(con('cotizaciones.configurar', A), A)).toBe(true)
    expect(puedeAbrirElOrigen(con('cotizaciones.configurar', A), B)).toBe(false)
    expect(puedeAbrirElOrigen(con('flujos.configurar'), B)).toBe(true)
    expect(puedeAbrirElOrigen(con('leads.ver'), A)).toBe(false)
  })
})

describe('pestanasDelOrigen', () => {
  it('son las seis, en su orden y con su ruta', () => {
    expect(pestanasDelOrigen(con('origenes.gestionar'), A).map((p) => [p.clave, p.ruta])).toEqual([
      ['datos', `/configuracion/origenes/${A}/datos`],
      ['campos', `/configuracion/origenes/${A}/campos`],
      ['categorias', `/configuracion/origenes/${A}/categorias`],
      ['flujo', `/configuracion/origenes/${A}/flujo`],
      ['formulas', `/configuracion/origenes/${A}/formulas`],
      ['tablas', `/configuracion/origenes/${A}/tablas`],
    ])
  })

  it('sin el permiso de la pestaña en este origen, apagada con su motivo', () => {
    const motivos = Object.fromEntries(
      pestanasDelOrigen(con('cotizaciones.configurar', A), A).map((p) => [p.clave, p.motivo]),
    )
    expect(motivos).toEqual({
      datos: undefined,
      campos: undefined,
      categorias: undefined,
      flujo: 'Lo configura quien tiene el permiso «Configurar el flujo».',
      formulas: undefined,
      tablas: undefined,
    })
    const enOtro = pestanasDelOrigen(con('cotizaciones.configurar', B), A)
    expect(enOtro.find((p) => p.clave === 'formulas')?.motivo).toBe(
      'Lo configura quien tiene el permiso «Configurar el cotizador».',
    )
    expect(enOtro.find((p) => p.clave === 'tablas')?.motivo).toBe(
      'Lo configura quien tiene el permiso «Configurar el cotizador».',
    )
  })

  it('puedeAbrirLaPestana dice lo mismo que las pestañas', () => {
    expect(puedeAbrirLaPestana(con('flujos.configurar', A), A, 'flujo')).toBe(true)
    expect(puedeAbrirLaPestana(con('flujos.configurar', A), A, 'formulas')).toBe(false)
    expect(puedeAbrirLaPestana(con('flujos.configurar', A), A, 'campos')).toBe(true)
  })
})

describe('primeraPestanaAbierta', () => {
  it('es Datos para quien abre el origen; null para quien no lo abre', () => {
    expect(primeraPestanaAbierta(con('flujos.configurar', A), A)?.clave).toBe('datos')
    expect(primeraPestanaAbierta(con('flujos.configurar', A), B)).toBeNull()
    expect(primeraPestanaAbierta([], A)).toBeNull()
  })
})
