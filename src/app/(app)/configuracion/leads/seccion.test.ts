import { describe, expect, it } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import { conSubseccionesVisibles, primeraSubseccionAbierta } from '../secciones'
import { PERMISOS_DE_LEADS, SECCION_DE_LEADS, SUBSECCIONES_DE_LEADS } from './seccion'

const con = (...claves: ClavePermiso[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' as const }))

const MOTIVO_CAMPOS = 'Te falta el permiso «Gestionar los campos de los leads».'

const comoLasVe = (permisos: Permisos) =>
  conSubseccionesVisibles(SECCION_DE_LEADS, permisos).subsecciones.map((sub) => [
    sub.clave,
    sub.apagada ? sub.motivoSinPermiso : undefined,
  ])

describe('las sub-secciones de Leads', () => {
  it('sólo «Campos» es una sub-ruta: lo demás son las tarjetas de la raíz', () => {
    expect(SUBSECCIONES_DE_LEADS.map((sub) => sub.clave)).toEqual(['campos'])
  })

  it('«Campos» vive debajo de la sección', () => {
    for (const sub of SUBSECCIONES_DE_LEADS) {
      expect(sub.ruta.startsWith(`${SECCION_DE_LEADS.ruta}/`), sub.ruta).toBe(true)
    }
  })

  it('se entra con cualquiera de los dos permisos: la unión, sin repetir', () => {
    expect(PERMISOS_DE_LEADS).toEqual(['leads.campos.gestionar', 'leads.configurar'])
    expect(SECCION_DE_LEADS.permisos).toBe(PERMISOS_DE_LEADS)
  })

  it('el buscador de Configuración sigue encontrando cada tarjeta por lo que se escribía', () => {
    for (const palabra of ['orígenes', 'prospecto', 'llamada', 'etapas', 'whatsapp', 'celular']) {
      expect(SECCION_DE_LEADS.palabras, palabra).toContain(palabra)
    }
  })
})

describe('qué abre cada combinación de permisos', () => {
  it('con los dos, «Campos» abierta', () => {
    const permisos = con('leads.configurar', 'leads.campos.gestionar')
    expect(comoLasVe(permisos)).toEqual([['campos', undefined]])
    expect(primeraSubseccionAbierta(SECCION_DE_LEADS, permisos)).toBe('/configuracion/leads/campos')
  })

  it('con sólo leads.configurar, «Campos» apagada con su motivo', () => {
    const permisos = con('leads.configurar')
    expect(comoLasVe(permisos)).toEqual([['campos', MOTIVO_CAMPOS]])
    expect(primeraSubseccionAbierta(SECCION_DE_LEADS, permisos)).toBeNull()
  })

  it('con sólo leads.campos.gestionar, «Campos» abierta', () => {
    const permisos = con('leads.campos.gestionar')
    expect(comoLasVe(permisos)).toEqual([['campos', undefined]])
    expect(primeraSubseccionAbierta(SECCION_DE_LEADS, permisos)).toBe('/configuracion/leads/campos')
  })

  it('sin ninguno, no hay adónde ir', () => {
    expect(primeraSubseccionAbierta(SECCION_DE_LEADS, con('leads.ver'))).toBeNull()
  })
})
