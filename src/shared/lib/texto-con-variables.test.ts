import { describe, expect, it } from 'vitest'
import {
  avisoDeVariablesDesconocidas,
  insertarEnElCursor,
  partesDelTexto,
  revisarVariables,
} from './texto-con-variables'

const CLAVES = ['cliente', 'codigo'] as const

describe('partesDelTexto', () => {
  it('parte en texto, variables y desconocidas, y unidas dan el texto', () => {
    const texto = 'Hola, {cliente}. Tu {codigo} y {foo}!'
    const partes = partesDelTexto(texto, CLAVES)
    expect(partes).toEqual([
      { tipo: 'texto', valor: 'Hola, ' },
      { tipo: 'variable', valor: '{cliente}', clave: 'cliente' },
      { tipo: 'texto', valor: '. Tu ' },
      { tipo: 'variable', valor: '{codigo}', clave: 'codigo' },
      { tipo: 'texto', valor: ' y ' },
      { tipo: 'desconocida', valor: '{foo}', clave: 'foo' },
      { tipo: 'texto', valor: '!' },
    ])
    expect(partes.map((parte) => parte.valor).join('')).toBe(texto)
  })

  it('una errata de mayúsculas es desconocida y `{}` también', () => {
    expect(partesDelTexto('{Codigo}{}', CLAVES).map((p) => p.tipo)).toEqual([
      'desconocida',
      'desconocida',
    ])
  })

  it('un texto sin variables es una sola parte y uno vacío, ninguna', () => {
    expect(partesDelTexto('sin nada', CLAVES)).toEqual([{ tipo: 'texto', valor: 'sin nada' }])
    expect(partesDelTexto('', CLAVES)).toEqual([])
  })
})

describe('revisarVariables', () => {
  it('dice las desconocidas sin repetir y las obligatorias que faltan', () => {
    expect(revisarVariables('{foo} {bar} {foo} {cliente}', CLAVES, ['codigo'])).toEqual({
      desconocidas: ['foo', 'bar'],
      faltan: ['codigo'],
    })
  })

  it('todo en orden: nada', () => {
    expect(revisarVariables('{cliente} {codigo}', CLAVES, ['codigo'])).toEqual({
      desconocidas: [],
      faltan: [],
    })
  })
})

describe('avisoDeVariablesDesconocidas', () => {
  it('una sola: en singular y con las que sí vale', () => {
    expect(avisoDeVariablesDesconocidas(['foo'], ['cliente', 'empresa', 'codigo'])).toBe(
      '{foo} no es una variable de este texto. Usa {cliente}, {empresa} o {codigo}.',
    )
  })

  it('varias: en plural', () => {
    expect(avisoDeVariablesDesconocidas(['a', 'b'], ['cliente'])).toBe(
      '{a} y {b} no son variables de este texto. Usa {cliente}.',
    )
  })

  it('ninguna: sin aviso', () => {
    expect(avisoDeVariablesDesconocidas([], CLAVES)).toBeNull()
  })
})

describe('insertarEnElCursor', () => {
  it('inserta en el cursor y lo deja detrás de lo escrito', () => {
    expect(insertarEnElCursor('Hola, .', 6, 6, '{cliente}')).toEqual({
      texto: 'Hola, {cliente}.',
      cursor: 15,
    })
  })

  it('reemplaza lo seleccionado', () => {
    expect(insertarEnElCursor('Hola, XXX.', 6, 9, '{cliente}')).toEqual({
      texto: 'Hola, {cliente}.',
      cursor: 15,
    })
  })

  it('al principio, al final y en un texto vacío', () => {
    expect(insertarEnElCursor('abc', 0, 0, '{x}').texto).toBe('{x}abc')
    expect(insertarEnElCursor('abc', 3, 3, '{x}').texto).toBe('abc{x}')
    expect(insertarEnElCursor('', 0, 0, '{x}')).toEqual({ texto: '{x}', cursor: 3 })
  })

  it('acota los índices fuera de rango y endereza un rango al revés', () => {
    expect(insertarEnElCursor('abc', 99, 99, '{x}').texto).toBe('abc{x}')
    expect(insertarEnElCursor('abc', -4, -1, '{x}').texto).toBe('{x}abc')
    expect(insertarEnElCursor('abcdef', 4, 1, '-').texto).toBe('a-ef')
  })
})
