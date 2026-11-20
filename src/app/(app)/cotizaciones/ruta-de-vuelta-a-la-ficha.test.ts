import { describe, expect, it } from 'vitest'
import { rutaDeVueltaALaFicha } from './ruta-de-vuelta-a-la-ficha'

describe('rutaDeVueltaALaFicha', () => {
  it('sin más consulta que la del resumen, es la ruta de la ficha', () => {
    expect(
      rutaDeVueltaALaFicha(
        '/leads/1',
        { cotizacion: 'x', pestana: 'vehiculo', visor: 'v', foto: '2' },
        'cotizacion',
      ),
    ).toBe('/leads/1')
  })

  it('conserva lo que ya llevaba la ficha y suelta lo del resumen y sus diálogos', () => {
    expect(
      rutaDeVueltaALaFicha(
        '/leads/1',
        {
          seccion: 'cotizaciones',
          cotizacion: 'x',
          panel: 'compartir',
          para: 'x',
        },
        'cotizacion',
      ),
    ).toBe('/leads/1?seccion=cotizaciones')
  })

  it('un parámetro repetido vale el primero', () => {
    expect(rutaDeVueltaALaFicha('/vehiculos/2', { seccion: ['a', 'b'] }, 'cotizacion')).toBe(
      '/vehiculos/2?seccion=a',
    )
  })
})
