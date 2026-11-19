import { describe, expect, it } from 'vitest'
import { celda, grilla, rect, texto } from './edicion.soporte'
import { mapaDeLaGrilla } from './mapa-de-la-grilla'
import {
  casillasVacias,
  celdaNueva,
  combinada,
  conAbarca,
  conEstilo,
  enPlural,
  idsDeCeldas,
  iguales,
} from './piezas'

describe('las piezas de las operaciones', () => {
  const P = grilla(2, 2, [{ ...celda('a', 0, 0, texto('A')), abarca_columnas: 2 }])
  it('las casillas vacías de un rectángulo', () => {
    expect(casillasVacias(mapaDeLaGrilla(P), rect(0, 0, 1, 1))).toEqual([
      { f: 1, k: 0 },
      { f: 1, k: 1 },
    ])
  })
  it('una celda nueva por casilla, con o sin estilo', () => {
    expect(celdaNueva(P, 'c1', { f: 1, k: 1 }, { contenido: texto('x') })).toEqual(
      celda('c1', 1, 1, texto('x')),
    )
    expect(
      celdaNueva(
        P,
        'c1',
        { f: 0, k: 0 },
        { contenido: { tipo: 'vacio' }, estilo: { negrita: true } },
      ),
    ).toHaveProperty('estilo')
    expect(idsDeCeldas(P)).toEqual(new Set(['a']))
  })
  it('las combinaciones y el estilo no escriben lo que no hace falta', () => {
    const a = P.celdas[0] ?? celda('a', 0, 0)
    expect(combinada(a)).toBe(true)
    expect(conAbarca(a, 1, 1)).toEqual(celda('a', 0, 0, texto('A')))
    expect(conAbarca(a, 3, 1)).toEqual({ ...celda('a', 0, 0, texto('A')), abarca_filas: 3 })
    expect(conEstilo({ ...a, estilo: { negrita: true } }, undefined)).not.toHaveProperty('estilo')
    expect(iguales({ x: 1 }, { x: 1 })).toBe(true)
  })
  it('el plural de un anuncio', () => {
    expect(enPlural(1, 'Se vació la celda.', 'Se vaciaron N celdas.')).toBe('Se vació la celda.')
    expect(enPlural(3, 'Se vació la celda.', 'Se vaciaron N celdas.')).toBe('Se vaciaron 3 celdas.')
  })
})
