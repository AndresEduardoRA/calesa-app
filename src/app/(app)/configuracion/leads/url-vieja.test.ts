import { describe, expect, it } from 'vitest'
import { SUBSECCIONES_DE_LEADS } from './seccion'
import { comoBusqueda, destinoDeLeads } from './url-vieja'

const ID = '00000000-0000-4000-8000-000000000001'
const TODAS = SUBSECCIONES_DE_LEADS.map((sub) => sub.ruta)
const SIN_CAMPOS = TODAS.filter((ruta) => ruta !== '/configuracion/leads/campos')
const de = (busqueda: string) => new URLSearchParams(busqueda)

describe('destinoDeLeads', () => {
  it('cada `seccion` abierta va a su sub-ruta', () => {
    for (const sub of SUBSECCIONES_DE_LEADS) {
      expect(destinoDeLeads(de(`seccion=${sub.clave}`), TODAS)).toBe(sub.ruta)
    }
  })

  it('conserva los paneles y lo que eligen, en su orden', () => {
    expect(destinoDeLeads(de('seccion=tipos&panel=nuevo-tipo'), TODAS)).toBe(
      '/configuracion/leads/tipos?panel=nuevo-tipo',
    )
    expect(destinoDeLeads(de(`panel=editar-origen&seccion=origenes&origen=${ID}`), TODAS)).toBe(
      `/configuracion/leads/origenes?panel=editar-origen&origen=${ID}`,
    )
    expect(destinoDeLeads(de(`seccion=tipos&panel=eliminar-tipo&tipo=${ID}`), TODAS)).toBe(
      `/configuracion/leads/tipos?panel=eliminar-tipo&tipo=${ID}`,
    )
    expect(destinoDeLeads(de(`seccion=seguimientos&tipo-de-seguimiento=${ID}`), TODAS)).toBe(
      `/configuracion/leads/seguimientos?tipo-de-seguimiento=${ID}`,
    )
    expect(destinoDeLeads(de(`seccion=campos&campo=${ID}`), TODAS)).toBe(
      `/configuracion/leads/campos?campo=${ID}`,
    )
    expect(destinoDeLeads(de('seccion=embudo&panel=restablecer-embudo'), TODAS)).toBe(
      '/configuracion/leads/embudo?panel=restablecer-embudo',
    )
  })

  it('una apagada va a la primera abierta, sin parámetros', () => {
    expect(destinoDeLeads(de(`seccion=campos&campo=${ID}`), SIN_CAMPOS)).toBe(
      '/configuracion/leads/origenes',
    )
    expect(
      destinoDeLeads(de('seccion=tipos&panel=nuevo-tipo'), ['/configuracion/leads/campos']),
    ).toBe('/configuracion/leads/campos')
  })

  it('sin `seccion`, o con algo que no es una sub-sección, va a la primera con los parámetros', () => {
    expect(destinoDeLeads(de(''), TODAS)).toBe('/configuracion/leads/campos')
    expect(destinoDeLeads(de(''), SIN_CAMPOS)).toBe('/configuracion/leads/origenes')
    expect(destinoDeLeads(de('seccion=%3Cscript%3E'), TODAS)).toBe('/configuracion/leads/campos')
    expect(destinoDeLeads(de('seccion='), TODAS)).toBe('/configuracion/leads/campos')
    expect(destinoDeLeads(de(`campo=${ID}`), TODAS)).toBe(`/configuracion/leads/campos?campo=${ID}`)
  })

  it('sin ninguna abierta no hay adónde ir', () => {
    expect(destinoDeLeads(de('seccion=tipos'), [])).toBeNull()
    expect(destinoDeLeads(de(''), [])).toBeNull()
  })

  it('ningún destino lleva `seccion`: no vuelve a redirigir', () => {
    for (const busqueda of [
      'seccion=tipos&panel=nuevo-tipo',
      'seccion=x',
      'seccion=campos&seccion=tipos',
    ]) {
      expect(destinoDeLeads(de(busqueda), TODAS)).not.toContain('seccion')
    }
  })
})

describe('comoBusqueda', () => {
  it('pasa cada valor, también los que se repiten, y salta los vacíos', () => {
    expect(comoBusqueda({ seccion: 'tipos', panel: ['a', 'b'], otro: undefined }).toString()).toBe(
      'seccion=tipos&panel=a&panel=b',
    )
  })
})
