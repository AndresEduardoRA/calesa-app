import { describe, expect, it } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import { conSubseccionesVisibles, primeraSubseccionAbierta } from '../secciones'
import {
  DATOS_DE_LA_EMPRESA,
  PERMISOS_DE_EMPRESA,
  SECCION_DE_EMPRESA,
  SUBSECCIONES_DE_EMPRESA,
} from './seccion'

const con = (...claves: ClavePermiso[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' as const }))

const abiertas = (permisos: Permisos) =>
  conSubseccionesVisibles(SECCION_DE_EMPRESA, permisos)
    .subsecciones.filter((sub) => !sub.apagada)
    .map((sub) => sub.clave)

describe('las sub-secciones de Empresa', () => {
  it('cualquiera de los dos permisos abre Datos, Monedas e Integraciones', () => {
    expect(abiertas(con('empresa.tipos_cambio.gestionar'))).toEqual([
      'datos',
      'monedas',
      'integraciones',
    ])
    expect(abiertas(con('empresa.ajustes.gestionar'))).toEqual([
      'datos',
      'monedas',
      'integraciones',
      'comprobantes',
    ])
  })

  it('sin ninguno, no abre ninguna y no hay adónde ir', () => {
    expect(abiertas(con('leads.ver'))).toEqual([])
    expect(primeraSubseccionAbierta(SECCION_DE_EMPRESA, con('leads.ver'))).toBeNull()
  })

  it('la primera es la índice, en la ruta de la sección, y es adonde va quien no abre Comprobantes', () => {
    expect(SUBSECCIONES_DE_EMPRESA[0]).toBe(DATOS_DE_LA_EMPRESA)
    expect(DATOS_DE_LA_EMPRESA.ruta).toBe(SECCION_DE_EMPRESA.ruta)
    expect(
      primeraSubseccionAbierta(SECCION_DE_EMPRESA, con('empresa.tipos_cambio.gestionar')),
    ).toBe('/configuracion/empresa')
  })

  it('PERMISOS_DE_EMPRESA es la unión de los de sus sub-secciones, sin repetir', () => {
    expect(PERMISOS_DE_EMPRESA).toEqual([
      'empresa.ajustes.gestionar',
      'empresa.tipos_cambio.gestionar',
    ])
    expect(SECCION_DE_EMPRESA.permisos).toBe(PERMISOS_DE_EMPRESA)
  })

  it('ninguna clave se repite', () => {
    const claves = SUBSECCIONES_DE_EMPRESA.map((sub) => sub.clave)
    expect(new Set(claves).size).toBe(claves.length)
  })
})
