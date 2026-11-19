import { describe, expect, it } from 'vitest'
import { encimaEnParDe, modoDeLaHermana } from './hermana'

const disponible = (puedeGuardar: boolean) =>
  ({ id: 'h', disponible: true, actualizadoEn: 'x', puedeGuardar }) as const

describe('modoDeLaHermana', () => {
  it('en par con la hermana disponible y el mismo permiso de guardar', () => {
    expect(modoDeLaHermana(disponible(true), true, '40 pies')).toEqual({ modo: 'par' })
    expect(modoDeLaHermana(disponible(false), false, '40 pies')).toEqual({ modo: 'par' })
  })

  it('sola con su aviso si no está disponible o si sólo se puede guardar una', () => {
    const aviso = { modo: 'sola', aviso: 'La de 40 pies no está disponible.' }
    expect(modoDeLaHermana({ id: 'h', disponible: false }, true, '40 pies')).toEqual(aviso)
    expect(modoDeLaHermana(disponible(false), true, '40 pies')).toEqual(aviso)
    expect(modoDeLaHermana(disponible(true), false, '40 pies')).toEqual(aviso)
  })

  it('sin hermana, la de siempre', () => {
    expect(modoDeLaHermana(null, true, '40 pies')).toEqual({ modo: 'sin_hermana' })
  })
})

describe('encimaEnParDe', () => {
  const par = {
    nodo: 'contenedor',
    etiqueta: 'Contenedor',
    opciones: [
      { clave: 'c20', etiqueta: '20 pies' },
      { clave: 'c40', etiqueta: '40 pies' },
    ],
  } as const
  const hoja = (puede: boolean, opcion: string) => ({
    cotizacion: { id: 'esta' },
    cadena: { puedeCotizarEncimaEnPar: puede },
    hermana: disponible(true),
    opcionDelPar: opcion,
    diseno: { par },
  })

  it('las dos anteriores en el orden de las opciones y la posición de la abierta', () => {
    expect(encimaEnParDe(hoja(true, 'c40'))).toEqual({ anteriores: ['h', 'esta'], cual: 1 })
    expect(encimaEnParDe(hoja(true, 'c20'))).toEqual({ anteriores: ['esta', 'h'], cual: 0 })
  })

  it('sin el permiso de la base o sin la hermana disponible, nada', () => {
    expect(encimaEnParDe(hoja(false, 'c20'))).toBeNull()
    expect(
      encimaEnParDe({ ...hoja(true, 'c20'), hermana: { id: 'h', disponible: false } }),
    ).toBeNull()
  })
})
