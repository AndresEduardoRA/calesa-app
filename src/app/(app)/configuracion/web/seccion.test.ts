import { describe, expect, it } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import { conSubseccionesVisibles, primeraSubseccionAbierta } from '../secciones'
import { PERMISOS_DE_WEB, SECCION_DE_WEB, SUBSECCIONES_DE_WEB } from './seccion'

const con = (...claves: ClavePermiso[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' as const }))

const estado = (permisos: Permisos) =>
  conSubseccionesVisibles(SECCION_DE_WEB, permisos).subsecciones.map(
    (sub) => [sub.clave, sub.apagada ?? false] as const,
  )

describe('las sub-secciones de Sitio web', () => {
  it('son las cinco, en su orden, cada una con su ruta y su frase', () => {
    expect(SUBSECCIONES_DE_WEB.map((sub) => [sub.titulo, sub.ruta])).toEqual([
      ['Ajustes', '/configuracion/web/ajustes'],
      ['Legales', '/configuracion/web/legales'],
      ['Guías', '/configuracion/web/guias'],
      ['Preguntas frecuentes', '/configuracion/web/faqs'],
      ['Testimonios', '/configuracion/web/testimonios'],
    ])
    expect(SUBSECCIONES_DE_WEB.every((sub) => sub.descripcion.endsWith('.'))).toBe(true)
  })

  it('«Ajustes» y «Legales» piden web.ajustes.gestionar; el resto, web.contenido.gestionar', () => {
    const permisosDe = (clave: string) =>
      SUBSECCIONES_DE_WEB.find((sub) => sub.clave === clave)?.permisos
    expect(permisosDe('ajustes')).toEqual(['web.ajustes.gestionar'])
    expect(permisosDe('legales')).toEqual(['web.ajustes.gestionar'])
    for (const clave of ['guias', 'faqs', 'testimonios']) {
      expect(permisosDe(clave)).toEqual(['web.contenido.gestionar'])
    }
    expect(PERMISOS_DE_WEB).toEqual(['web.ajustes.gestionar', 'web.contenido.gestionar'])
    expect(SECCION_DE_WEB.permisos).toBe(PERMISOS_DE_WEB)
  })

  it('lo que la persona no puede abrir figura apagado con su motivo, no quitado', () => {
    expect(estado(con('web.ajustes.gestionar'))).toEqual([
      ['ajustes', false],
      ['legales', false],
      ['guias', true],
      ['faqs', true],
      ['testimonios', true],
    ])
    expect(estado(con('web.contenido.gestionar'))).toEqual([
      ['ajustes', true],
      ['legales', true],
      ['guias', false],
      ['faqs', false],
      ['testimonios', false],
    ])
    expect(SUBSECCIONES_DE_WEB.every((sub) => (sub.motivoSinPermiso ?? '') !== '')).toBe(true)
  })

  it('la URL de la que no puede abrir lo lleva a la primera que sí; sin ningún permiso, a ninguna', () => {
    expect(
      primeraSubseccionAbierta(
        SECCION_DE_WEB,
        con('web.ajustes.gestionar', 'web.contenido.gestionar'),
      ),
    ).toBe('/configuracion/web/ajustes')
    expect(primeraSubseccionAbierta(SECCION_DE_WEB, con('web.contenido.gestionar'))).toBe(
      '/configuracion/web/guias',
    )
    expect(primeraSubseccionAbierta(SECCION_DE_WEB, con('web.cola.gestionar'))).toBeNull()
    expect(primeraSubseccionAbierta(SECCION_DE_WEB, [])).toBeNull()
  })

  it('ninguna clave se repite', () => {
    const claves = SUBSECCIONES_DE_WEB.map((sub) => sub.clave)
    expect(new Set(claves).size).toBe(claves.length)
  })
})
