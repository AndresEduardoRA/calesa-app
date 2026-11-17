import { describe, expect, it } from 'vitest'
import {
  aspectoDeCabecera,
  aspectoDeItem,
  aspectoDeItemConAncho,
  aspectoDeSeccion,
} from './aspecto-de-la-hoja'

describe('el aspecto de la hoja', () => {
  it('sin aspecto no escribe ninguna clave', () => {
    expect(aspectoDeItem({})).toStrictEqual({})
    expect(aspectoDeItemConAncho({})).toStrictEqual({})
    expect(aspectoDeSeccion({})).toStrictEqual({})
    expect(aspectoDeCabecera({})).toStrictEqual({})
  })

  it('copia sólo las claves de su pieza que vinieron, sin `undefined`', () => {
    const crudo = { ancho: 8, alto: 2, letra: 'grande', enfasis: undefined, nodo: 'x' } as const
    expect(aspectoDeItemConAncho(crudo)).toStrictEqual({ ancho: 8, alto: 2, letra: 'grande' })
    // La celda lleva su ancho aparte (obligatorio): el aspecto del ítem no lo copia.
    expect(aspectoDeItem(crudo)).toStrictEqual({ alto: 2, letra: 'grande' })
  })

  it('la sección y la cabecera, con todo su aspecto', () => {
    const seccion = {
      id: 'base',
      ancho: 6,
      alto: 3,
      relleno: 'chico',
      separacion: 'grande',
      densidad: 'compacta',
      letra: 'chica',
      enfasis: 'fuerte',
      tono: 'compra',
    } as const
    const { id: _id, ...aspecto } = seccion
    expect(aspectoDeSeccion(seccion)).toStrictEqual(aspecto)
    expect(
      aspectoDeCabecera({ tono: 'aduana', relleno: 'grande', letra: 'normal', enfasis: 'normal' }),
    ).toStrictEqual({ tono: 'aduana', relleno: 'grande', letra: 'normal', enfasis: 'normal' })
  })
})
