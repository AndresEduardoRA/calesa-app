import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { conSubseccionesVisibles } from '../../secciones'
import { PERMISOS_DE_EMPRESA, SECCION_DE_EMPRESA } from '../seccion'
import { SUBSECCION_DE_COMPROBANTES } from './subseccion'

const con = (...claves: string[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' as const })) as Permisos

const comoLaVe = (permisos: Permisos) =>
  conSubseccionesVisibles(SECCION_DE_EMPRESA, permisos).subsecciones.find(
    (sub) => sub.clave === 'comprobantes',
  )

// Quién abre la sub-sección «Comprobantes» de Empresa.
describe('la sub-sección «Comprobantes» de Empresa', () => {
  it('la abre quien gestiona los ajustes de la empresa', () => {
    expect(comoLaVe(con('empresa.ajustes.gestionar'))?.apagada).toBeUndefined()
  })

  it('quien sólo gestiona tipos de cambio, o sólo emite comprobantes, la ve apagada con su motivo', () => {
    expect(comoLaVe(con('empresa.tipos_cambio.gestionar'))?.apagada).toBe(true)
    expect(comoLaVe(con('cotizaciones.comprobantes.emitir'))?.apagada).toBe(true)
    expect(SUBSECCION_DE_COMPROBANTES.motivoSinPermiso).toBe(
      'Pide el permiso «Ajustes de la empresa».',
    )
  })

  it('no suma claves para entrar a Empresa: las suyas ya están entre las de la empresa', () => {
    for (const clave of SUBSECCION_DE_COMPROBANTES.permisos) {
      expect(PERMISOS_DE_EMPRESA).toContain(clave)
    }
    expect(PERMISOS_DE_EMPRESA).not.toContain('cotizaciones.comprobantes.emitir')
  })
})
