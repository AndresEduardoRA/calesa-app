import { describe, expect, it } from 'vitest'
import { destinoDeLaVitrinaRapida } from './enlace-viejo-de-la-vitrina-rapida'

const ID = '0b1c2d3e-0000-4000-8000-000000000001'
const ORIGEN = '0b1c2d3e-0000-4000-8000-0000000000aa'

describe('destinoDeLaVitrinaRapida', () => {
  it('sin el panel viejo no es un enlace viejo', () => {
    expect(destinoDeLaVitrinaRapida({ origen: ORIGEN })).toBeNull()
    expect(destinoDeLaVitrinaRapida({ panel: 'vitrina', para: ID })).toBeNull()
  })

  it('lleva al panel completo de la vitrina y conserva el origen, los filtros y el cursor', () => {
    const destino = destinoDeLaVitrinaRapida({
      origen: ORIGEN,
      panel: 'vitrina-rapida',
      para: ID,
      marca: 'Kia',
      cursor: 'abc',
    })
    expect(destino).not.toBeNull()
    const url = new URL(destino ?? '', 'http://x')
    expect(url.pathname).toBe('/vehiculos')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      origen: ORIGEN,
      panel: 'vitrina',
      para: ID,
      marca: 'Kia',
      cursor: 'abc',
    })
  })

  it('un filtro repetido sigue repetido', () => {
    const url = new URL(
      destinoDeLaVitrinaRapida({ panel: 'vitrina-rapida', para: ID, fase: ['a', 'b'] }) ?? '',
      'http://x',
    )
    expect(url.searchParams.getAll('fase')).toEqual(['a', 'b'])
  })

  it('un «para» que no es un id se quita con el panel', () => {
    expect(destinoDeLaVitrinaRapida({ origen: ORIGEN, panel: 'vitrina-rapida', para: 'x' })).toBe(
      `/vehiculos?origen=${ORIGEN}`,
    )
    expect(destinoDeLaVitrinaRapida({ panel: 'vitrina-rapida' })).toBe('/vehiculos')
  })
})
