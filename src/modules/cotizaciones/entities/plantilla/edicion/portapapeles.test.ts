import { describe, expect, it } from 'vitest'
import { MOTIVO_DE_LA_COMBINACION_CORTADA } from './combinar'
import { MOTIVOS_DEL_TEXTO } from './contenido'
import {
  anuncioDe,
  celda,
  celdaPorId,
  grilla,
  motivoDe,
  ocupante,
  plantillaDe,
  rect,
  texto,
} from './edicion.soporte'
import { copiar, pegar, pegarTexto, textoDelBloque } from './portapapeles'

const P = grilla(4, 4, [
  { ...celda('a', 0, 0, texto('Hola')), estilo: { negrita: true, fondo: 'verde' } },
  celda('b', 0, 1, { tipo: 'dato', nodo: 'remate', mostrar: 'monto' }),
  { ...celda('m', 1, 0, texto('Combinada\tcon\ttabs')), abarca_columnas: 2 },
])

describe('copiar y pegar', () => {
  it('copia contenido, estilo y combinaciones relativas al rango', () => {
    expect(copiar(P, rect(0, 0, 1, 1))).toEqual({
      filas: 2,
      columnas: 2,
      celdas: [
        { df: 0, dk: 0, contenido: texto('Hola'), estilo: { negrita: true, fondo: 'verde' } },
        { df: 0, dk: 1, contenido: { tipo: 'dato', nodo: 'remate', mostrar: 'monto' } },
        { df: 1, dk: 0, abarca_columnas: 2, contenido: texto('Combinada\tcon\ttabs') },
      ],
    })
  })
  it('pega texto y formato desde la celda activa, con ids nuevos', () => {
    const r = pegar(P, { f: 2, k: 2 }, copiar(P, rect(0, 0, 1, 1)))
    const p = plantillaDe(r)
    expect(anuncioDe(r)).toBe('Se pegaron 3 celdas.')
    expect(celdaPorId(p, ocupante(p, 2, 2) ?? '')).toMatchObject({
      contenido: texto('Hola'),
      estilo: { negrita: true, fondo: 'verde' },
    })
    expect(ocupante(p, 3, 3)).toBe(ocupante(p, 3, 2))
    expect(r.ok && r.seleccion).toEqual({
      tipo: 'celdas',
      ancla: { f: 2, k: 2 },
      foco: { f: 3, k: 3 },
    })
  })
  it('lo que había en el destino se reemplaza', () => {
    const p = plantillaDe(pegar(P, { f: 0, k: 1 }, copiar(P, rect(0, 0))))
    expect(celdaPorId(p, 'b')).toBeUndefined()
    expect(celdaPorId(p, ocupante(p, 0, 1) ?? '')?.contenido).toEqual(texto('Hola'))
    expect(anuncioDe(pegar(P, { f: 3, k: 3 }, copiar(P, rect(0, 0))))).toBe('Se pegó una celda.')
    expect(anuncioDe(pegar(P, { f: 3, k: 3 }, copiar(P, rect(3, 3))))).toBe(
      'Se pegó un rango vacío.',
    )
  })
  it('si no cabe, dice cuánto falta', () => {
    const bloque = copiar(P, rect(0, 0, 1, 1))
    expect(motivoDe(pegar(P, { f: 0, k: 3 }, bloque))).toBe('No cabe: falta 1 columna.')
    expect(motivoDe(pegar(P, { f: 3, k: 0 }, bloque))).toBe('No cabe: falta 1 fila.')
    expect(motivoDe(pegar(P, { f: 3, k: 3 }, bloque))).toBe('No cabe: faltan 1 fila y 1 columna.')
    expect(motivoDe(pegar(P, { f: 0, k: 3 }, copiar(P, rect(0, 0, 0, 3))))).toBe(
      'No cabe: faltan 3 columnas.',
    )
  })
  it('si el destino corta una combinación, no', () => {
    expect(motivoDe(pegar(P, { f: 1, k: 1 }, copiar(P, rect(3, 3))))).toBe(
      MOTIVO_DE_LA_COMBINACION_CORTADA,
    )
  })
})

describe('el portapapeles del sistema', () => {
  it('el texto del bloque en TSV: el de las celdas de texto, vacío lo demás', () => {
    expect(textoDelBloque(copiar(P, rect(0, 0, 1, 2)))).toBe('Hola\t\t\nCombinada con tabs\t\t')
  })
  it('el texto plano se pega como texto de la celda activa, sin el salto final', () => {
    const r = pegarTexto(P, { f: 3, k: 0 }, 'Del sistema\r\n')
    expect(anuncioDe(r)).toBe('Se pegó el texto.')
    expect(celdaPorId(plantillaDe(r), ocupante(plantillaDe(r), 3, 0) ?? '')?.contenido).toEqual(
      texto('Del sistema'),
    )
    expect(motivoDe(pegarTexto(P, { f: 3, k: 0 }, 'Hola {{x}}'))).toBe(MOTIVOS_DEL_TEXTO.llaves)
    expect(
      celdaPorId(plantillaDe(pegarTexto(P, { f: 0, k: 0 }, 'uno\r\ndos')), 'a')?.contenido,
    ).toEqual(texto('uno\ndos'))
  })
})
