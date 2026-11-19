import { describe, expect, it } from 'vitest'
import casos from '../casos-de-diseno.json'
import { esquemaDiseno, type Diseno } from '../diseno'
import { esquemaDefinicion } from '../formula'
import { validarDiseno } from '../validar-diseno'
import {
  ponerAyuda,
  ponerEnlace,
  quitarEnlace,
  rechazoDelEnlace,
  sumarEnlace,
} from './edicion-de-items'

const juego = casos as unknown as {
  contexto: { niveles: string[]; retirados: string[]; tonos: string[] }
  formulas: Record<string, { definicion: unknown }>
  casos: { nombre: string; diseno: unknown }[]
}
const definicion = esquemaDefinicion.parse(juego.formulas['capturas']?.definicion)

function congelar<T>(valor: T): T {
  if (typeof valor === 'object' && valor !== null) {
    Object.values(valor).forEach(congelar)
    Object.freeze(valor)
  }
  return valor
}
// El diseño de las capturas con una ayuda de texto en `remate`.
const conTexto = (): Diseno =>
  congelar(
    ponerAyuda(
      esquemaDiseno.parse(juego.casos.find((c) => c.nombre.startsWith('capturas'))?.diseno),
      'compra',
      'remate',
      { texto: 'Mira la subasta.' },
    ),
  )
const ayuda = (d: Diseno) => {
  const it = d.secciones
    .find((s) => s.id === 'compra')
    ?.items.find((i) => i.tipo === 'celda' && i.nodo === 'remate')
  return it?.tipo === 'celda' ? it.ayuda : undefined
}
const valida = (d: Diseno) => validarDiseno(definicion, d, juego.contexto).ok
const EN = { seccion: 'compra', nodo: 'remate' }

describe('los enlaces de la ayuda', () => {
  it('agregar suma uno vacío al final, hasta 5; llenarlo deja el diseño válido', () => {
    let d = sumarEnlace(conTexto(), 'compra', 'remate')
    expect(ayuda(d)).toEqual({ texto: 'Mira la subasta.', enlaces: [{ titulo: '', url: '' }] })
    expect(valida(d)).toBe(false)
    d = ponerEnlace(d, { ...EN, posicion: 0 }, { titulo: 'Copart', url: 'https://www.copart.com/' })
    expect(valida(d)).toBe(true)
    for (let i = 0; i < 6; i += 1) d = sumarEnlace(d, 'compra', 'remate')
    const leida = ayuda(d)
    expect(leida !== undefined && 'texto' in leida ? leida.enlaces : []).toHaveLength(5)
  })

  it('escribir el texto conserva los enlaces; borrarlo se los lleva', () => {
    const d = ponerEnlace(
      sumarEnlace(conTexto(), 'compra', 'remate'),
      { ...EN, posicion: 0 },
      {
        titulo: 'Copart',
        url: 'https://www.copart.com/',
      },
    )
    expect(ayuda(ponerAyuda(d, 'compra', 'remate', { texto: 'Otro texto' }))).toEqual({
      texto: 'Otro texto',
      enlaces: [{ titulo: 'Copart', url: 'https://www.copart.com/' }],
    })
    expect(ayuda(ponerAyuda(d, 'compra', 'remate', { texto: '' }))).toBeUndefined()
    expect(ayuda(ponerAyuda(d, 'compra', 'remate', { tabla: 'depreciacion' }))).toEqual({
      tabla: 'depreciacion',
    })
  })

  it('quitar el último enlace quita la clave', () => {
    const d = sumarEnlace(conTexto(), 'compra', 'remate')
    expect(ayuda(quitarEnlace(d, { ...EN, posicion: 0 }))).toEqual({ texto: 'Mira la subasta.' })
  })

  it('sin ayuda de texto no hay enlaces que agregar', () => {
    const sinAyuda = congelar(ponerAyuda(conTexto(), 'compra', 'remate', null))
    expect(sumarEnlace(sinAyuda, 'compra', 'remate')).toEqual(sinAyuda)
  })
})

describe('rechazoDelEnlace', () => {
  it('un título vacío o largo (en caracteres) y una URL que no es https', () => {
    expect(rechazoDelEnlace({ titulo: '', url: 'https://a.com' })).toEqual({
      titulo: 'Escribe un título.',
    })
    expect(rechazoDelEnlace({ titulo: '😀'.repeat(60), url: 'https://a.com' })).toEqual({})
    expect(rechazoDelEnlace({ titulo: 'x'.repeat(61), url: 'https://a.com' })).toEqual({
      titulo: 'Hasta 60 caracteres.',
    })
    expect(rechazoDelEnlace({ titulo: 'A', url: 'http://a.com' })).toEqual({
      url: 'Tiene que empezar con https://.',
    })
    expect(rechazoDelEnlace({ titulo: 'A', url: 'javascript:alert(1)' })).toEqual({
      url: 'Tiene que empezar con https://.',
    })
    expect(rechazoDelEnlace({ titulo: 'A', url: 'https://a.com/con espacio' })).toEqual({
      url: 'No puede llevar espacios ni tildes.',
    })
    expect(rechazoDelEnlace({ titulo: 'A', url: `https://${'a'.repeat(2000)}` })).toEqual({
      url: 'Hasta 2000 caracteres.',
    })
  })
})
