import { describe, expect, it } from 'vitest'
import type { ParDeHoja } from './hoja-en-par'
import { tituloBaseDeLaHermana, tituloDeLaHermana, topeDelTituloEnPar } from './titulo-en-par'

const par: ParDeHoja = {
  nodo: 'contenedor',
  etiqueta: 'Contenedor',
  opciones: [
    { clave: 'c20', etiqueta: '20 pies' },
    { clave: 'c40', etiqueta: 'Contenedor de 40' },
  ],
}

describe('el título de una hermana', () => {
  it('el tope deja lugar al sufijo más largo', () => {
    expect(topeDelTituloEnPar(par)).toBe(120 - ' · Contenedor de 40'.length)
  })

  it('se edita sin su opción y se compone con ella, como la base', () => {
    expect(tituloBaseDeLaHermana('Hilux 2020 · 20 pies', '20 pies')).toBe('Hilux 2020')
    expect(tituloBaseDeLaHermana('Hilux 2020', '20 pies')).toBe('Hilux 2020')
    expect(tituloBaseDeLaHermana(null, '20 pies')).toBeNull()
    expect(tituloDeLaHermana('Hilux 2020', '40 pies')).toBe('Hilux 2020 · 40 pies')
  })
})
