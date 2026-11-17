import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { LeadDeFicha } from '../../../entities/ficha'
import { DatosDeLaFicha } from './datos-de-la-ficha'

afterEach(cleanup)

const ficha = {
  id: 'l-1',
  nombre: 'Ana Prieto',
  creadoEn: '2026-11-10T14:00:00Z',
  atributos: {},
  enCartera: true,
} as unknown as LeadDeFicha

describe('DatosDeLaFicha: el origen apagado', () => {
  it('se lee «Facebook (inactivo)» de corrido: el espacio es texto y no sólo el hueco entre cajas', () => {
    const { container } = render(
      <DatosDeLaFicha
        ficha={ficha}
        campos={[]}
        origen={{ nombre: 'Facebook', activo: false, icono: 'compartir' }}
        tipo={null}
      />,
    )
    expect(container.textContent).toContain('Facebook (inactivo)')
  })

  it('uno activo no lleva marca, y nada se pliega', () => {
    const { container } = render(
      <DatosDeLaFicha
        ficha={ficha}
        campos={[]}
        origen={{ nombre: 'Facebook', activo: true, icono: null }}
        tipo={null}
      />,
    )
    expect(container.textContent).toContain('Facebook')
    expect(container.textContent).not.toContain('(inactivo)')
    expect(container.querySelector('details')).toBeNull()
    expect(screen.getByRole('heading', { level: 2, name: 'Datos' })).toBeTruthy()
  })
})
