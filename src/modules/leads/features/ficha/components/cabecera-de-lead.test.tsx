import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { LeadDeFicha } from '../../../entities/ficha'
import { CabeceraDeLead } from './cabecera-de-lead'

afterEach(cleanup)

const ficha = {
  id: 'l-1',
  nombre: 'Ana Prieto',
  numeros: { numero: 12, numeroPropio: null, creadorDelPropio: null },
  telefono: '59170000004',
  telefonoCc: null,
  tieneNombre: 'Rosa Mamani',
} as unknown as LeadDeFicha

describe('CabeceraDeLead', () => {
  it('el nombre con el «⋯» en la misma fila, y quién lo tiene debajo', () => {
    const { container } = render(
      <CabeceraDeLead
        ficha={ficha}
        menu={<button type="button">Más acciones de Ana Prieto</button>}
        cartera="Dueño: Rosa Mamani · Compartido con Luis"
      />,
    )
    const titulo = screen.getByRole('heading', { level: 1, name: 'Ana Prieto' })
    const menu = screen.getByRole('button', { name: 'Más acciones de Ana Prieto' })
    // La fila del nombre: el `h1` y la esquina del «⋯» son hermanos.
    expect(menu.parentElement?.parentElement).toBe(titulo.parentElement)
    expect(screen.getByText('Dueño: Rosa Mamani · Compartido con Luis')).toBeTruthy()
    expect(container.textContent).toContain('12')
    // El teléfono va en «Datos»: no se repite en la cabecera.
    expect(container.textContent).not.toContain('70000004')
  })

  it('sin cartera a la vista ni menú, sólo el nombre y los números', () => {
    const { container } = render(<CabeceraDeLead ficha={ficha} cartera={null} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(container.querySelector('p')).toBeNull()
  })
})
