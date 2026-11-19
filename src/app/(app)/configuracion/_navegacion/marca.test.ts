import { describe, expect, it } from 'vitest'
import { marcaDelEnlace, rutaDelMenu, rutaResuelta } from './marca'

describe('marcaDelEnlace', () => {
  it('la ruta exacta es la página', () => {
    expect(marcaDelEnlace('/configuracion/leads', '/configuracion/leads')).toBe('page')
  })

  it('una ruta de más abajo que no es sub-sección marca su sección: el detalle de un origen', () => {
    const id = '00000000-0000-4000-8000-000000000001'
    expect(marcaDelEnlace(`/configuracion/origenes/${id}`, '/configuracion/origenes')).toBe('page')
  })

  it('en una sub-sección, la sección es la rama y la sub-sección la página', () => {
    const subrutas = ['/configuracion/leads/campos', '/configuracion/leads/embudo']
    expect(marcaDelEnlace('/configuracion/leads/campos', '/configuracion/leads', subrutas)).toBe(
      'true',
    )
    expect(marcaDelEnlace('/configuracion/leads/campos', '/configuracion/leads/campos')).toBe(
      'page',
    )
    expect(
      marcaDelEnlace('/configuracion/leads/campos', '/configuracion/leads/embudo'),
    ).toBeUndefined()
  })

  it('otra sección, un prefijo sin barra o el inicio no marcan', () => {
    expect(marcaDelEnlace('/configuracion/flujos', '/configuracion/leads')).toBeUndefined()
    expect(marcaDelEnlace('/configuracion/web-cola', '/configuracion/web')).toBeUndefined()
    expect(marcaDelEnlace('/configuracion', '/configuracion/empresa')).toBeUndefined()
  })

  it('la sub-sección índice se marca sólo en su ruta exacta; la sección queda como rama', () => {
    const subrutas = ['/configuracion/empresa', '/configuracion/empresa/monedas']
    expect(marcaDelEnlace('/configuracion/empresa', '/configuracion/empresa', [], true)).toBe(
      'page',
    )
    expect(
      marcaDelEnlace('/configuracion/empresa/monedas', '/configuracion/empresa', [], true),
    ).toBeUndefined()
    expect(marcaDelEnlace('/configuracion/empresa', '/configuracion/empresa', subrutas)).toBe(
      'true',
    )
    expect(
      marcaDelEnlace('/configuracion/empresa/monedas', '/configuracion/empresa', subrutas),
    ).toBe('true')
  })
})

describe('sub-secciones plantilla (las partes de un origen)', () => {
  const id = '00000000-0000-4000-8000-000000000001'
  const plantillas = [
    '/configuracion/origenes/[id]/datos',
    '/configuracion/origenes/[id]/campos',
    '/configuracion/origenes/[id]/categorias',
  ]

  it('dentro de un origen, la sección es la rama y la parte resuelta es la página', () => {
    const actual = `/configuracion/origenes/${id}/campos`
    expect(marcaDelEnlace(actual, '/configuracion/origenes', plantillas)).toBe('true')
    const campos = rutaResuelta('/configuracion/origenes/[id]/campos', actual)
    expect(campos).toBe(actual)
    expect(marcaDelEnlace(actual, campos ?? '')).toBe('page')
    expect(rutaResuelta('/configuracion/origenes/[id]/datos', actual)).toBe(
      `/configuracion/origenes/${id}/datos`,
    )
    expect(
      marcaDelEnlace(actual, rutaResuelta('/configuracion/origenes/[id]/datos', actual) ?? ''),
    ).toBeUndefined()
  })

  it('en la lista, la sección es la página y las plantillas no resuelven', () => {
    expect(marcaDelEnlace('/configuracion/origenes', '/configuracion/origenes', plantillas)).toBe(
      'page',
    )
    expect(
      rutaResuelta('/configuracion/origenes/[id]/campos', '/configuracion/origenes'),
    ).toBeNull()
  })

  it('en un origen sin parte (la URL vieja), la sección es la página', () => {
    expect(
      marcaDelEnlace(`/configuracion/origenes/${id}`, '/configuracion/origenes', plantillas),
    ).toBe('page')
  })

  it('en otra sección no resuelven; una ruta sin plantilla vuelve igual', () => {
    expect(
      rutaResuelta('/configuracion/origenes/[id]/campos', '/configuracion/leads/campos'),
    ).toBeNull()
    expect(rutaResuelta('/configuracion/leads/campos', '/configuracion/origenes')).toBe(
      '/configuracion/leads/campos',
    )
  })
})

describe('el comodín sólo acepta un id', () => {
  const id = '00000000-0000-4000-8000-000000000001'
  const formula = '/configuracion/cotizacion/[origen]/formula'

  it('«general» no ocupa el lugar de un origen', () => {
    expect(rutaResuelta(formula, '/configuracion/cotizacion/general/colores')).toBeNull()
    expect(
      marcaDelEnlace('/configuracion/cotizacion/general/colores', '/configuracion/cotizacion', [
        formula,
        '/configuracion/cotizacion/general/colores',
      ]),
    ).toBe('true')
    expect(marcaDelEnlace('/configuracion/cotizacion/general/colores', formula)).toBeUndefined()
  })

  it('un id sí', () => {
    expect(rutaResuelta(formula, `/configuracion/cotizacion/${id}/hoja`)).toBe(
      `/configuracion/cotizacion/${id}/formula`,
    )
  })
})

describe('rutaDelMenu', () => {
  const id = '00000000-0000-4000-8000-000000000001'
  const formula = {
    ruta: '/configuracion/cotizacion/[origen]/formula',
    respaldo: '/configuracion/cotizacion?seccion=formula',
  }

  it('con un origen en la URL, la plantilla resuelta', () => {
    expect(rutaDelMenu(formula, `/configuracion/cotizacion/${id}/tablas`)).toBe(
      `/configuracion/cotizacion/${id}/formula`,
    )
  })

  it('en el inicio o en General, una plantilla con respaldo da el respaldo', () => {
    expect(rutaDelMenu(formula, '/configuracion/cotizacion')).toBe(formula.respaldo)
    expect(rutaDelMenu(formula, '/configuracion/cotizacion/general/niveles')).toBe(formula.respaldo)
  })

  it('en la lista de orígenes, sin respaldo, nada; una ruta fija vuelve igual', () => {
    expect(
      rutaDelMenu({ ruta: '/configuracion/origenes/[id]/datos' }, '/configuracion/origenes'),
    ).toBeNull()
    expect(rutaDelMenu({ ruta: '/configuracion/leads/campos' }, '/configuracion/origenes')).toBe(
      '/configuracion/leads/campos',
    )
  })
})
