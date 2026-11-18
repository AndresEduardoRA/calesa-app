import { describe, expect, it } from 'vitest'
import { PANELES_DE_LA_FICHA, destinoDelEnlaceViejo } from './enlace-viejo-del-resumen'

const ID = '2b1c1f0e-3f7a-4c33-9a43-0d2f6b0e8a11'
const OTRO = '9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a'
const FICHA = `/vehiculos/${ID}`

describe('destinoDelEnlaceViejo', () => {
  it('sin `?vehiculo=` (o vacío) no es un enlace viejo', () => {
    expect(destinoDelEnlaceViejo({ vehiculo: undefined })).toBeNull()
    expect(destinoDelEnlaceViejo({ vehiculo: '', panel: 'vitrina' })).toBeNull()
  })

  it('el vehículo solo lleva a su ficha', () => {
    expect(destinoDelEnlaceViejo({ vehiculo: ID })).toBe(FICHA)
  })

  it('cada panel que la ficha abre sigue; otro se quita', () => {
    for (const panel of PANELES_DE_LA_FICHA) {
      expect(destinoDelEnlaceViejo({ vehiculo: ID, panel })).toBe(`${FICHA}?panel=${panel}`)
    }
    expect([...PANELES_DE_LA_FICHA].sort()).toEqual([
      'desvincular',
      'fechas-de-subasta',
      'marcar-interesado',
      'vincular-lead',
      'vitrina',
    ])
    expect(destinoDelEnlaceViejo({ vehiculo: ID, panel: 'nuevo' })).toBe(FICHA)
    expect(destinoDelEnlaceViejo({ vehiculo: ID, panel: 'vitrina-rapida' })).toBe(FICHA)
  })

  it('el visor del resumen pasa al de la ficha (la clave es el id), con su foto si es un número', () => {
    expect(destinoDelEnlaceViejo({ vehiculo: ID, visor: `${ID}-resumen` })).toBe(
      `${FICHA}?visor=${ID}`,
    )
    expect(destinoDelEnlaceViejo({ vehiculo: ID, visor: `${ID}-resumen`, foto: '3' })).toBe(
      `${FICHA}?visor=${ID}&foto=3`,
    )
    expect(destinoDelEnlaceViejo({ vehiculo: ID, visor: ID, foto: '2' })).toBe(
      `${FICHA}?visor=${ID}&foto=2`,
    )
    expect(destinoDelEnlaceViejo({ vehiculo: ID, visor: ID, foto: 'x' })).toBe(
      `${FICHA}?visor=${ID}`,
    )
    // El visor de otro vehículo (la miniatura de otra fila) no es de esta ficha.
    expect(destinoDelEnlaceViejo({ vehiculo: ID, visor: OTRO })).toBe(FICHA)
  })

  it('`?pestana=fotos` abre el visor en la primera foto; otra pestaña se quita; con visor, gana el visor', () => {
    expect(destinoDelEnlaceViejo({ vehiculo: ID, pestana: 'fotos' })).toBe(
      `${FICHA}?visor=${ID}&foto=1`,
    )
    expect(destinoDelEnlaceViejo({ vehiculo: ID, pestana: 'interesados' })).toBe(FICHA)
    expect(
      destinoDelEnlaceViejo({ vehiculo: ID, pestana: 'fotos', visor: `${ID}-resumen`, foto: '4' }),
    ).toBe(`${FICHA}?visor=${ID}&foto=4`)
  })

  it('la edición del mismo vehículo sigue; la de otro se quita', () => {
    expect(destinoDelEnlaceViejo({ vehiculo: ID, editar: ID })).toBe(`${FICHA}?editar=${ID}`)
    expect(destinoDelEnlaceViejo({ vehiculo: ID, editar: OTRO })).toBe(FICHA)
  })

  it('panel, visor y edición juntos', () => {
    expect(
      destinoDelEnlaceViejo({ vehiculo: ID, panel: 'vitrina', pestana: 'fotos', editar: ID }),
    ).toBe(`${FICHA}?panel=vitrina&visor=${ID}&foto=1&editar=${ID}`)
  })

  it('un valor que no es un id redirige igual, codificado (la ficha dice que no está disponible)', () => {
    expect(destinoDelEnlaceViejo({ vehiculo: 'no-es-un-id' })).toBe('/vehiculos/no-es-un-id')
    expect(destinoDelEnlaceViejo({ vehiculo: '../leads?x=1' })).toBe(
      '/vehiculos/..%2Fleads%3Fx%3D1',
    )
  })
})
