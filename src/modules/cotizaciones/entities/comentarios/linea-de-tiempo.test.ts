import { describe, expect, it } from 'vitest'
import type { RevisionDeLaCotizacion } from '../revisiones'
import type { Adjunto } from './adjunto'
import type { ComentarioRaiz } from './comentario'
import {
  entradasLeidas,
  lineaDeTiempo,
  todasLeidas,
  type LecturaDeUnaFuente,
  type LecturasDeLaLinea,
} from './linea-de-tiempo'

const dia = (n: number, hora = '10:00:00') => `2026-11-${String(n).padStart(2, '0')}T${hora}+00:00`

const adjunto = (id: string, creadoEn: string): Adjunto => ({
  id,
  ruta: `c/${id}.pdf`,
  nombre: `${id}.pdf`,
  mime: 'application/pdf',
  bytes: 10,
  creadoEn,
  autor: { nombre: 'Ana' },
  mio: false,
})
const revision = (id: number, creadoEn: string): RevisionDeLaCotizacion => ({
  id,
  usuarioId: null,
  creadoEn,
  autor: null,
  diff: {},
})
const comentario = (id: string, creadoEn: string): ComentarioRaiz => ({
  id,
  autor: { id: null, nombre: 'Luis' },
  cuerpo: id,
  creadoEn,
  actualizadoEn: creadoEn,
  editado: false,
  eliminado: false,
  mio: false,
  respuestas: [],
  hayMasRespuestas: false,
})

const fuente = <T>(items: T[], hayMas = false): LecturaDeUnaFuente<T> => ({
  items,
  hayMas,
  leida: true,
})

function lecturas(parcial: Partial<LecturasDeLaLinea>): LecturasDeLaLinea {
  return {
    adjuntos: fuente<Adjunto>([]),
    revisiones: fuente<RevisionDeLaCotizacion>([]),
    comentarios: fuente<ComentarioRaiz>([]),
    ...parcial,
  }
}

const ids = (l: ReturnType<typeof lineaDeTiempo>) => l.entradas.map((e) => `${e.tipo}:${e.id}`)

describe('lineaDeTiempo', () => {
  it('sin nada que leer no hay entradas ni qué pedir', () => {
    expect(lineaDeTiempo(lecturas({}))).toEqual({ entradas: [], porPedir: [] })
  })

  it('mezcla las tres fuentes con lo más nuevo arriba', () => {
    const l = lineaDeTiempo(
      lecturas({
        adjuntos: fuente([adjunto('a1', dia(3))]),
        revisiones: fuente([revision(7, dia(5)), revision(6, dia(1))]),
        comentarios: fuente([comentario('c2', dia(4)), comentario('c1', dia(2))]),
      }),
    )
    expect(ids(l)).toEqual([
      'revision:7',
      'comentario:c2',
      'adjunto:a1',
      'comentario:c1',
      'revision:6',
    ])
    expect(l.porPedir).toEqual([])
  })

  it('ordena por microsegundos, no por milisegundos', () => {
    const l = lineaDeTiempo(
      lecturas({
        comentarios: fuente([
          comentario('c2', '2026-11-05T10:00:00.123457+00:00'),
          comentario('c1', '2026-11-05T10:00:00.123456+00:00'),
        ]),
      }),
    )
    expect(ids(l)).toEqual(['comentario:c2', 'comentario:c1'])
  })

  it('a igual instante el orden es el mismo siempre: comentario, revisión, adjunto', () => {
    const l = lineaDeTiempo(
      lecturas({
        adjuntos: fuente([adjunto('a', dia(2))]),
        revisiones: fuente([revision(1, dia(2))]),
        comentarios: fuente([comentario('c', dia(2))]),
      }),
    )
    expect(ids(l)).toEqual(['comentario:c', 'revision:1', 'adjunto:a'])
  })
})

describe('lineaDeTiempo: hasta dónde se dibuja', () => {
  it('sólo dibuja hasta donde llegó la fuente que menos retrocedió y le pide a ella', () => {
    // Los comentarios llegaron hasta el día 10 y tienen más; las revisiones, hasta el 2 y tienen más: lo del 3 al 9 aún puede tener un comentario sin leer.
    const l = lineaDeTiempo(
      lecturas({
        comentarios: fuente([comentario('c2', dia(12)), comentario('c1', dia(10))], true),
        revisiones: fuente([revision(9, dia(11)), revision(8, dia(6)), revision(7, dia(2))], true),
      }),
    )
    expect(ids(l)).toEqual(['comentario:c2', 'revision:9', 'comentario:c1'])
    expect(l.porPedir).toEqual(['comentarios'])
  })

  it('una fuente completa no marca el borde aunque sea la más vieja', () => {
    const l = lineaDeTiempo(
      lecturas({
        adjuntos: fuente([adjunto('a1', dia(1))]),
        comentarios: fuente([comentario('c2', dia(12)), comentario('c1', dia(10))], true),
      }),
    )
    expect(ids(l)).toEqual(['comentario:c2', 'comentario:c1'])
    expect(l.porPedir).toEqual(['comentarios'])
  })

  it('con dos fuentes en el mismo borde les pide a las dos', () => {
    const l = lineaDeTiempo(
      lecturas({
        comentarios: fuente([comentario('c1', dia(10))], true),
        revisiones: fuente([revision(1, dia(10))], true),
      }),
    )
    expect(l.porPedir).toEqual(['revisiones', 'comentarios'])
    expect(ids(l)).toEqual(['comentario:c1', 'revision:1'])
  })

  it('cuando la última fuente con más ya llegó al principio, se dibuja todo', () => {
    const l = lineaDeTiempo(
      lecturas({
        comentarios: fuente([comentario('c2', dia(12)), comentario('c1', dia(10))]),
        revisiones: fuente([revision(2, dia(6)), revision(1, dia(2))]),
      }),
    )
    expect(l.entradas).toHaveLength(4)
    expect(l.porPedir).toEqual([])
  })
})

describe('entradasLeidas y todasLeidas', () => {
  it('cuenta lo leído de las tres, dibujado o no', () => {
    const todas = lecturas({
      adjuntos: fuente([adjunto('a', dia(1))]),
      revisiones: fuente([revision(1, dia(1)), revision(2, dia(2))]),
      comentarios: fuente([comentario('c', dia(1))]),
    })
    expect(entradasLeidas(todas)).toBe(4)
  })

  it('«todas leídas» pide la primera página de las tres', () => {
    expect(todasLeidas(lecturas({}))).toBe(true)
    expect(todasLeidas(lecturas({ revisiones: { items: [], hayMas: false, leida: false } }))).toBe(
      false,
    )
  })
})
