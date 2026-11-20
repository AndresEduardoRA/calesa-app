import { describe, expect, it } from 'vitest'
import { circuloDeLasIniciales } from './circulo-de-las-iniciales'
import type { EstiloDibujado } from './estilo-de-la-celda'

const celda = (
  ancho: number,
  alto: number,
  alinear: EstiloDibujado['alinear'] = 'centro',
  alinearVertical: EstiloDibujado['alinearVertical'] = 'centro',
) => ({ ancho, alto, estilo: { alinear, alinearVertical } as EstiloDibujado })

describe('circuloDeLasIniciales', () => {
  it('el diámetro es el lado menor de la caja interior, con el borde de 1,5 px y la letra al 40 %', () => {
    expect(circuloDeLasIniciales(celda(108, 58), 1)).toEqual({
      interior: { ancho: 100, alto: 50 },
      x: 25,
      y: 0,
      diametro: 50,
      borde: 1.5,
      letra: 20,
    })
  })

  it('se alinea como la celda en el lado que sobra', () => {
    expect(circuloDeLasIniciales(celda(108, 58, 'izquierda'), 1)?.x).toBe(0)
    expect(circuloDeLasIniciales(celda(108, 58, 'derecha'), 1)?.x).toBe(50)
    expect(circuloDeLasIniciales(celda(58, 108, 'centro', 'abajo'), 1)?.y).toBe(50)
  })

  it('en el PDF, el relleno y el borde a la escala de la celda', () => {
    const c = circuloDeLasIniciales(celda(81, 43.5), 0.75)
    expect(c?.interior).toEqual({ ancho: 75, alto: 37.5 })
    expect(c?.borde).toBe(1.125)
  })

  it('una celda sin caja interior no dibuja nada', () => {
    expect(circuloDeLasIniciales(celda(8, 40), 1)).toBeNull()
  })
})
