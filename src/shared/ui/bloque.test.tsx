import { cleanup, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Bloque } from './bloque'
import { BloquesALaVista } from './bloques-a-la-vista'

afterEach(cleanup)

describe('<Bloque>', () => {
  it('sin <BloquesALaVista> es el <details> de siempre, plegado si se pide', () => {
    const { container } = render(
      <>
        <Bloque titulo="Identidad">
          <p>Nombre</p>
        </Bloque>
        <Bloque titulo="Demora" plegado>
          <p>Días</p>
        </Bloque>
      </>,
    )
    const detalles = container.querySelectorAll('details')
    expect(detalles).toHaveLength(2)
    expect(detalles[0]).toHaveAttribute('open')
    expect(detalles[1]).not.toHaveAttribute('open')
    expect(screen.queryByRole('heading')).toBeNull()
  })

  it('a la vista es una sección con su h3, sin <details>, aunque esté plegado', () => {
    const { container } = render(
      <BloquesALaVista>
        <Bloque titulo="Datos" plegado>
          <p>Nombre</p>
        </Bloque>
      </BloquesALaVista>,
    )
    expect(container.querySelector('details')).toBeNull()
    expect(screen.getByRole('heading', { level: 3, name: 'Datos' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Datos' })).toHaveTextContent('Nombre')
  })

  it('anidado, el de adentro lleva h4', () => {
    render(
      <BloquesALaVista nivel={3}>
        <Bloque titulo="Datos">
          <Bloque titulo="Identidad" plegado>
            <p>Nombre</p>
          </Bloque>
        </Bloque>
      </BloquesALaVista>,
    )
    expect(screen.getByRole('heading', { level: 3, name: 'Datos' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'Identidad' })).toBeInTheDocument()
  })

  it('a la vista avisa `onAbrir` una sola vez al montarse', () => {
    const alAbrir = vi.fn()
    const { rerender } = render(
      <StrictMode>
        <BloquesALaVista>
          <Bloque titulo="Requisitos" onAbrir={alAbrir}>
            <p>Uno</p>
          </Bloque>
        </BloquesALaVista>
      </StrictMode>,
    )
    rerender(
      <StrictMode>
        <BloquesALaVista>
          <Bloque titulo="Requisitos" onAbrir={alAbrir}>
            <p>Dos</p>
          </Bloque>
        </BloquesALaVista>
      </StrictMode>,
    )
    expect(alAbrir).toHaveBeenCalledTimes(1)
  })
})
