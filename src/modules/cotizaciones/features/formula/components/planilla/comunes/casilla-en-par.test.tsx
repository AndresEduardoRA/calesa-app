import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NodoOpcion } from '../../../../../entities/nodos'
import { CasillaEnPar } from './casilla-en-par'

afterEach(cleanup)

const variante = (claves: string[], enPar?: boolean): NodoOpcion => ({
  id: 'contenedor',
  tipo: 'opcion',
  etiqueta: 'Contenedor',
  opciones: claves.map((c) => ({ clave: c, etiqueta: c, titulo: c })),
  ...(enPar === undefined ? {} : { en_par: enPar }),
})
const casilla = () => screen.getByRole('checkbox', { name: 'Se cotiza en par' })

describe('CasillaEnPar', () => {
  it('con dos opciones se marca y avisa con el id de la variante', () => {
    const alCambiar = vi.fn()
    render(<CasillaEnPar nodo={variante(['c20', 'c40'])} bloqueada={false} alCambiar={alCambiar} />)
    expect(casilla()).not.toHaveAttribute('aria-describedby')
    fireEvent.click(casilla())
    expect(alCambiar).toHaveBeenCalledWith('contenedor', true)
  })

  it('con tres opciones va apagada y dice por qué', () => {
    render(<CasillaEnPar nodo={variante(['a', 'b', 'c'])} bloqueada={false} alCambiar={vi.fn()} />)
    expect(casilla()).toHaveAttribute('aria-disabled', 'true')
    expect(casilla()).toHaveAccessibleDescription(
      'Sólo una variante de dos opciones se cotiza en par.',
    )
  })

  it('espera mientras otra cosa está abierta', () => {
    render(<CasillaEnPar nodo={variante(['a', 'b'], true)} bloqueada alCambiar={vi.fn()} />)
    expect(casilla()).toHaveAttribute('aria-checked', 'true')
    expect(casilla()).toHaveAttribute('aria-disabled', 'true')
  })
})
