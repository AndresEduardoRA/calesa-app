import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LimiteDeBloque } from './limite-de-bloque'

const refrescar = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: refrescar }) }))

let debeFallar = true

function Bloque() {
  if (debeFallar) throw new Error('se rompió al dibujar')
  return <p>contenido del bloque</p>
}

beforeEach(() => {
  debeFallar = true
  refrescar.mockClear()
  // React y el límite avisan por consola de lo que atrapan: es lo esperado.
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('LimiteDeBloque', () => {
  it('un bloque que lanza deja su error con «Reintentar» y no tumba al hermano', () => {
    render(
      <>
        <p>otro bloque</p>
        <LimiteDeBloque>
          <Bloque />
        </LimiteDeBloque>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy()
    expect(screen.getByText('otro bloque')).toBeTruthy()
    expect(screen.queryByText('contenido del bloque')).toBeNull()
  })

  it('«Reintentar» vuelve a montar el bloque y pide la pantalla de nuevo', () => {
    render(
      <LimiteDeBloque>
        <Bloque />
      </LimiteDeBloque>,
    )
    debeFallar = false
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(screen.getByText('contenido del bloque')).toBeTruthy()
    expect(refrescar).toHaveBeenCalledTimes(1)
  })

  it('sin fallo, dibuja el contenido tal cual', () => {
    debeFallar = false
    render(
      <LimiteDeBloque>
        <Bloque />
      </LimiteDeBloque>,
    )
    expect(screen.getByText('contenido del bloque')).toBeTruthy()
  })
})
