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
  it('dice quién es (nombre y número) y nada de lo que la columna dice más abajo', () => {
    const { container } = render(
      <CabeceraDeLead ficha={ficha} acciones={<button type="button">Editar</button>} />,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Ana Prieto' })).toBeTruthy()
    expect(container.textContent).toContain('12')
    // El teléfono va en «Teléfonos» y quién lo tiene, en su bloque: no se repiten en la misma columna.
    expect(container.textContent).not.toContain('70000004')
    expect(container.textContent).not.toContain('Rosa Mamani')
    expect(screen.getByRole('button', { name: 'Editar' })).toBeTruthy()
  })
})
