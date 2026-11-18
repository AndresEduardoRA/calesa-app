import { describe, expect, it } from 'vitest'
import { destinoQuePregunta, type ClicEnUnEnlace } from './destino-de-un-clic'

const ACTUAL = new URL('https://app.test/configuracion/empresa?seccion=marca')
const clic = (cambios: Partial<ClicEnUnEnlace>): ClicEnUnEnlace => ({
  href: '/configuracion/leads',
  target: null,
  download: false,
  boton: 0,
  conModificador: false,
  ...cambios,
})

describe('destinoQuePregunta', () => {
  it('un enlace a otra pantalla de la app pregunta y devuelve su ruta', () => {
    expect(destinoQuePregunta(clic({}), ACTUAL)).toBe('/configuracion/leads')
    expect(destinoQuePregunta(clic({ href: '/leads?vista=tabla#arriba' }), ACTUAL)).toBe(
      '/leads?vista=tabla#arriba',
    )
  })

  it('la misma ruta con otra búsqueda también sale de la pantalla', () => {
    expect(destinoQuePregunta(clic({ href: '?seccion=monedas' }), ACTUAL)).toBe(
      '/configuracion/empresa?seccion=monedas',
    )
  })

  it('un ancla o la misma ruta y búsqueda no salen', () => {
    expect(destinoQuePregunta(clic({ href: '#monedas' }), ACTUAL)).toBeNull()
    expect(
      destinoQuePregunta(clic({ href: '/configuracion/empresa?seccion=marca' }), ACTUAL),
    ).toBeNull()
  })

  it('lo que se abre en otra pestaña, se descarga o va afuera no pregunta', () => {
    expect(destinoQuePregunta(clic({ target: '_blank' }), ACTUAL)).toBeNull()
    expect(destinoQuePregunta(clic({ conModificador: true }), ACTUAL)).toBeNull()
    expect(destinoQuePregunta(clic({ boton: 1 }), ACTUAL)).toBeNull()
    expect(destinoQuePregunta(clic({ download: true }), ACTUAL)).toBeNull()
    expect(destinoQuePregunta(clic({ href: 'https://otra.test/x' }), ACTUAL)).toBeNull()
  })

  it('target _self cuenta como la misma pestaña', () => {
    expect(destinoQuePregunta(clic({ target: '_self' }), ACTUAL)).toBe('/configuracion/leads')
  })
})
