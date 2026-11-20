import { describe, expect, it } from 'vitest'
import {
  cambiosDeLegales,
  estadoDeLegal,
  extractoDeLegal,
  legalesDesde,
  legalesInvalidos,
  sinImagenes,
  type LegalGuardado,
} from './legales'

const parrafo = (texto: string) => ({
  type: 'paragraph',
  content: [{ type: 'text', text: texto }],
})
const doc = (...content: unknown[]) => ({ type: 'doc', content })
const imagen = { type: 'image', attrs: { ruta: 'guias/a.webp', alt: 'a' } }
const VACIO = doc({ type: 'paragraph' })

const guardado = {
  titulo: 'Términos',
  doc: doc(parrafo('Pagas al recibir.')),
  actualizado_en: '2026-11-12T10:00:00Z',
}
const VERSION = '2026-11-12T10:00:00.000000+00:00'

describe('legalesDesde', () => {
  it('lee lo guardado', () => {
    const leidos = legalesDesde({ terminos: guardado }, VERSION)
    expect(leidos.terminos?.titulo).toBe('Términos')
    expect(leidos.privacidad).toBeNull()
    expect(leidos.actualizadoEn).toBe(VERSION)
  })
  it('una forma rota, una clave desconocida o un documento fuera de la lista blanca no lanzan: es «no hay»', () => {
    expect(legalesDesde(null, VERSION).terminos).toBeNull()
    expect(legalesDesde('texto', VERSION).terminos).toBeNull()
    const roto = legalesDesde(
      {
        otra: guardado,
        terminos: { titulo: 3, doc: guardado.doc },
        privacidad: { titulo: 'P', doc: doc({ type: 'script' }) },
      },
      VERSION,
    )
    expect(roto.terminos).toBeNull()
    expect(roto.privacidad).toBeNull()
  })
})

describe('cambiosDeLegales', () => {
  it('omite el documento vacío y recorta el título', () => {
    const cambios = cambiosDeLegales({
      terminos: { titulo: '  Términos  ', doc: doc(parrafo('Hola.')) },
      privacidad: { titulo: 'Política', doc: VACIO },
    })
    expect(Object.keys(cambios)).toEqual(['terminos'])
    expect(cambios.terminos?.titulo).toBe('Términos')
  })
  it('quita las imágenes; un documento que sólo era una imagen se omite', () => {
    const cambios = cambiosDeLegales({
      terminos: { titulo: 'T', doc: doc(parrafo('Hola.'), imagen) },
      privacidad: { titulo: 'P', doc: doc(imagen) },
    })
    expect(cambios.terminos?.doc.content.map((bloque) => bloque.type)).toEqual(['paragraph'])
    expect(cambios.privacidad).toBeUndefined()
  })
  it('sinImagenes deja el resto', () => {
    expect(sinImagenes({ type: 'doc', content: [imagen as never] }).content).toEqual([])
  })
})

describe('legalesInvalidos', () => {
  const ninguno = { terminos: null, privacidad: null }
  const guardadoDe = legalesDesde({ terminos: guardado }, VERSION)
  it('un legal guardado al que se le vacía el texto no se puede guardar', () => {
    const motivos = legalesInvalidos(
      { terminos: { titulo: 'T', doc: VACIO }, privacidad: { titulo: 'P', doc: VACIO } },
      guardadoDe,
    )
    expect(motivos).toEqual({ terminos: 'Escribe el texto de los términos.' })
  })
  it('sin nada guardado ni escrito no hay motivos', () => {
    expect(
      legalesInvalidos(
        { terminos: { titulo: '', doc: VACIO }, privacidad: { titulo: '', doc: VACIO } },
        ninguno,
      ),
    ).toEqual({})
  })
  it('un título vacío o de 121 caracteres con texto da su motivo', () => {
    const motivos = legalesInvalidos(
      {
        terminos: { titulo: '   ', doc: doc(parrafo('Hola.')) },
        privacidad: { titulo: 'x'.repeat(121), doc: doc(parrafo('Hola.')) },
      },
      ninguno,
    )
    expect(motivos.terminosTitulo).toBe('Escribe el título.')
    expect(motivos.privacidadTitulo).toBe('El título lleva hasta 120 caracteres.')
  })
})

describe('con un solo documento (un modal por documento)', () => {
  it('cambiosDeLegales manda sólo el que llega', () => {
    const cambios = cambiosDeLegales({
      privacidad: { titulo: ' Privacidad ', doc: doc(parrafo('Cuidamos tus datos.')) },
    })
    expect(Object.keys(cambios)).toEqual(['privacidad'])
    expect(cambios.privacidad?.titulo).toBe('Privacidad')
  })
  it('legalesInvalidos no revisa el que no llega', () => {
    const motivos = legalesInvalidos(
      { terminos: { titulo: 'T', doc: doc(parrafo('Texto.')) } },
      {
        terminos: null,
        privacidad: { titulo: 'P', doc: doc(parrafo('Antes.')) as never, actualizadoEn: VERSION },
      },
    )
    expect(motivos).toEqual({})
  })
})

describe('estadoDeLegal', () => {
  const legal: LegalGuardado = { titulo: 'T', doc: doc(parrafo('x')) as never, actualizadoEn: null }
  it('lo guardado está publicado y lo que no existe no', () => {
    expect(estadoDeLegal(legal)).toBe('publicada')
    expect(estadoDeLegal(null)).toBe('sin-publicar')
  })
})

describe('extractoDeLegal', () => {
  const de = (...bloques: unknown[]) => doc(...bloques) as never
  it('junta los párrafos en una línea', () => {
    expect(extractoDeLegal(de(parrafo('Pagas al recibir.'), parrafo('Sin devoluciones.')))).toBe(
      'Pagas al recibir. Sin devoluciones.',
    )
  })
  it('corta en una palabra entera y marca que siguió', () => {
    const largo = 'palabra '.repeat(40)
    const extracto = extractoDeLegal(de(parrafo(largo)), 30)
    expect(extracto.endsWith('…')).toBe(true)
    expect(extracto.length).toBeLessThanOrEqual(31)
    expect(extracto).not.toContain('palabr…')
  })
  it('entra a las listas y a los títulos', () => {
    const lista = {
      type: 'bulletList',
      content: [
        { type: 'listItem', content: [parrafo('Uno')] },
        { type: 'listItem', content: [parrafo('Dos')] },
      ],
    }
    expect(
      extractoDeLegal(
        de(
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Condiciones' }],
          },
          lista,
        ),
      ),
    ).toBe('Condiciones Uno Dos')
  })
})
