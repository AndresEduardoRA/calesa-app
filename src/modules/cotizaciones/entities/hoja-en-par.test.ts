import { describe, expect, it } from 'vitest'
import { ladoDeLaOpcion, lineaDelPar, otroLado, rotuloEnPar, type ParDeHoja } from './hoja-en-par'

const par: ParDeHoja = {
  nodo: 'contenedor',
  etiqueta: 'Contenedor',
  opciones: [
    { clave: 'c20', etiqueta: '20 pies' },
    { clave: 'c40', etiqueta: '40 pies' },
  ],
}

describe('la hoja en par', () => {
  it('el rótulo de cada celda lleva su opción y la línea nombra las dos', () => {
    expect(rotuloEnPar('Transporte', par.opciones[0])).toBe('Transporte · 20 pies')
    expect(lineaDelPar(par)).toBe('Dos versiones: 20 pies y 40 pies.')
  })

  it('la columna de una opción por su clave', () => {
    expect(ladoDeLaOpcion(par, 'c40')).toBe(1)
    expect(ladoDeLaOpcion(par, 'c20')).toBe(0)
    expect(ladoDeLaOpcion(par, 'otra')).toBeNull()
    expect(ladoDeLaOpcion(par, null)).toBeNull()
    expect(otroLado(0)).toBe(1)
  })
})
