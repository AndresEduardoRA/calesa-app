import { describe, expect, it } from 'vitest'
import { cajaDelLogo } from './caja-del-logo'
import type { EstiloDibujado } from './estilo-de-la-celda'

type Alinear = EstiloDibujado['alinear']
type Vertical = EstiloDibujado['alinearVertical']

const celda = (
  ancho: number,
  alto: number,
  alinear: Alinear = 'centro',
  v: Vertical = 'centro',
) => ({
  ancho,
  alto,
  estilo: { alinear, alinearVertical: v } as EstiloDibujado,
})

describe('cajaDelLogo', () => {
  it('la caja interior es la celda menos 4 px por lado', () => {
    expect(cajaDelLogo(celda(290, 60), 1, { ancho: 1, alto: 1 })?.interior).toEqual({
      ancho: 282,
      alto: 52,
    })
  })

  it('un logo ancho en una celda alta llena el ancho y se alinea en vertical', () => {
    const casos: [Vertical, number][] = [
      ['arriba', 0],
      ['centro', 75],
      ['abajo', 150],
    ]
    for (const [v, y] of casos) {
      for (const h of ['izquierda', 'centro', 'derecha'] as const) {
        expect(cajaDelLogo(celda(208, 208, h, v), 1, { ancho: 400, alto: 100 })?.logo).toEqual({
          x: 0,
          y,
          ancho: 200,
          alto: 50,
        })
      }
    }
  })

  it('un logo alto en una celda ancha llena el alto y se alinea en horizontal', () => {
    const casos: [Alinear, number][] = [
      ['izquierda', 0],
      ['centro', 141 - 26],
      ['derecha', 282 - 52],
    ]
    for (const [h, x] of casos) {
      for (const v of ['arriba', 'centro', 'abajo'] as const) {
        expect(cajaDelLogo(celda(290, 60, h, v), 1, { ancho: 50, alto: 50 })?.logo).toEqual({
          x,
          y: 0,
          ancho: 52,
          alto: 52,
        })
      }
    }
  })

  it('con la escala del PDF el relleno también escala', () => {
    const caja = cajaDelLogo(celda(145, 30, 'derecha', 'abajo'), 0.5, { ancho: 4, alto: 1 })
    expect(caja?.interior).toEqual({ ancho: 141, alto: 26 })
    expect(caja?.logo).toEqual({ x: 141 - 104, y: 0, ancho: 104, alto: 26 })
  })

  it('sin espacio o sin medidas no hay caja', () => {
    expect(cajaDelLogo(celda(8, 60), 1, { ancho: 4, alto: 1 })).toBeNull()
    expect(cajaDelLogo(celda(100, 60), 1, { ancho: 0, alto: 1 })).toBeNull()
    expect(cajaDelLogo(celda(100, 60), 1, { ancho: 4, alto: 0 })).toBeNull()
  })
})
