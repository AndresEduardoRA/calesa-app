import { describe, expect, it } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import { conSubseccionesVisibles, primeraSubseccionAbierta } from '../secciones'
import { PERMISOS_DE_LEADS, SECCION_DE_LEADS, SUBSECCIONES_DE_LEADS } from './seccion'

const con = (...claves: ClavePermiso[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' as const }))

const MOTIVO_CAMPOS = 'Te falta el permiso «Gestionar los campos de los leads».'
const MOTIVO_LEADS = 'Te falta el permiso «Configurar leads».'

const comoLasVe = (permisos: Permisos) =>
  conSubseccionesVisibles(SECCION_DE_LEADS, permisos).subsecciones.map((sub) => [
    sub.clave,
    sub.apagada ? sub.motivoSinPermiso : undefined,
  ])

describe('las sub-secciones de Leads', () => {
  it('los tipos de seguimiento siguen a los tipos de lead; después, las dos plantillas y los teléfonos', () => {
    expect(SUBSECCIONES_DE_LEADS.map((sub) => sub.clave)).toEqual([
      'campos',
      'origenes',
      'tipos',
      'seguimientos',
      'embudo',
      'portal',
      'telefonos',
    ])
  })

  it('cada una vive debajo de la sección, que no tiene índice', () => {
    for (const sub of SUBSECCIONES_DE_LEADS) {
      expect(sub.ruta.startsWith(`${SECCION_DE_LEADS.ruta}/`), sub.ruta).toBe(true)
    }
  })

  it('se entra con cualquiera de los dos permisos: la unión, sin repetir', () => {
    expect(PERMISOS_DE_LEADS).toEqual(['leads.campos.gestionar', 'leads.configurar'])
    expect(SECCION_DE_LEADS.permisos).toBe(PERMISOS_DE_LEADS)
  })
})

describe('qué abre cada combinación de permisos', () => {
  it('con los dos, ninguna apagada, y abre «Campos»', () => {
    const permisos = con('leads.configurar', 'leads.campos.gestionar')
    expect(comoLasVe(permisos)).toEqual(SUBSECCIONES_DE_LEADS.map((sub) => [sub.clave, undefined]))
    expect(primeraSubseccionAbierta(SECCION_DE_LEADS, permisos)).toBe('/configuracion/leads/campos')
  })

  it('con sólo leads.configurar, «Campos» apagada con su motivo, y abre «Orígenes del lead»', () => {
    const permisos = con('leads.configurar')
    expect(comoLasVe(permisos)).toEqual([
      ['campos', MOTIVO_CAMPOS],
      ['origenes', undefined],
      ['tipos', undefined],
      ['seguimientos', undefined],
      ['embudo', undefined],
      ['portal', undefined],
      ['telefonos', undefined],
    ])
    expect(primeraSubseccionAbierta(SECCION_DE_LEADS, permisos)).toBe(
      '/configuracion/leads/origenes',
    )
  })

  it('con sólo leads.campos.gestionar, al revés', () => {
    const permisos = con('leads.campos.gestionar')
    expect(comoLasVe(permisos)).toEqual([
      ['campos', undefined],
      ['origenes', MOTIVO_LEADS],
      ['tipos', MOTIVO_LEADS],
      ['seguimientos', MOTIVO_LEADS],
      ['embudo', MOTIVO_LEADS],
      ['portal', MOTIVO_LEADS],
      ['telefonos', MOTIVO_LEADS],
    ])
    expect(primeraSubseccionAbierta(SECCION_DE_LEADS, permisos)).toBe('/configuracion/leads/campos')
  })

  it('sin ninguno, no hay adónde ir', () => {
    expect(primeraSubseccionAbierta(SECCION_DE_LEADS, con('leads.ver'))).toBeNull()
  })
})
