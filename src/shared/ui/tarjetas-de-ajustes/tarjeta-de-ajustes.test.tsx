import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MuestraDeColor, TarjetaDeAjustes, TarjetasDeAjustes, ValoresDeLaTarjeta } from '.'

afterEach(cleanup)

describe('TarjetaDeAjustes', () => {
  it('es una región con el nombre de su título, con la acción y el «⋯» en la cabecera', () => {
    render(
      <TarjetasDeAjustes etiqueta="Ajustes de la empresa">
        <TarjetaDeAjustes
          titulo="Identidad"
          estado={<span>Activa</span>}
          accion={<button type="button">Editar</button>}
          acciones={<button type="button">Más acciones de Identidad</button>}
        >
          <p>Cuerpo</p>
        </TarjetaDeAjustes>
      </TarjetasDeAjustes>,
    )
    const region = screen.getByRole('region', { name: 'Identidad' })
    expect(within(region).getByRole('heading', { name: 'Identidad', level: 2 })).toBeTruthy()
    const cabecera = region.querySelector('header')
    expect(cabecera).not.toBeNull()
    expect(within(cabecera as HTMLElement).getByRole('button', { name: 'Editar' })).toBeTruthy()
    expect(
      within(cabecera as HTMLElement).getByRole('button', { name: 'Más acciones de Identidad' }),
    ).toBeTruthy()
    expect(within(cabecera as HTMLElement).getByText('Activa')).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Ajustes de la empresa' })).toBeTruthy()
  })
})

describe('ValoresDeLaTarjeta', () => {
  it('un valor vacío dice «Sin dato» y la nota va bajo el valor', () => {
    render(
      <ValoresDeLaTarjeta
        filas={[
          { etiqueta: 'NIT', valor: null },
          { etiqueta: 'País', valor: 'Bolivia', nota: 'Se usa en los PDF.' },
        ]}
      />,
    )
    expect(screen.getByText('NIT').nextElementSibling?.textContent).toBe('Sin dato')
    expect(screen.getByText('Bolivia')).toBeTruthy()
    expect(screen.getByText('Se usa en los PDF.')).toBeTruthy()
  })
})

describe('MuestraDeColor', () => {
  it('dice el color en texto, no sólo lo pinta', () => {
    render(<MuestraDeColor color="#0b5fff" />)
    expect(screen.getByText('#0b5fff')).toBeTruthy()
  })
})
