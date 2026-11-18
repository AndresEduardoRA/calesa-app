import { describe, expect, it } from 'vitest'
import { marcaDelEnlace } from './marca'

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
})
