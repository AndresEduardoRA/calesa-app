import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LimiteDelHueco } from './limite-del-hueco'

let debeFallar = true

function Hueco() {
  if (debeFallar) throw new Error('se rompió al dibujar')
  return <p>contenido del hueco</p>
}

beforeEach(() => {
  debeFallar = true
  // React y el límite avisan por consola de lo que atrapan: es lo esperado.
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('LimiteDelHueco', () => {
  it('un hijo que lanza deja el aviso con el título del hueco y no tumba al hermano', () => {
    render(
      <>
        <p>otro hueco</p>
        <LimiteDelHueco titulo="Documentos">
          <Hueco />
        </LimiteDelHueco>
      </>,
    )
    expect(screen.getByText('No pudimos mostrar «Documentos».')).toBeTruthy()
    expect(screen.getByText('otro hueco')).toBeTruthy()
    expect(screen.queryByText('contenido del hueco')).toBeNull()
  })

  it('«Reintentar» vuelve a montar el hijo', () => {
    render(
      <LimiteDelHueco titulo="Notas">
        <Hueco />
      </LimiteDelHueco>,
    )
    debeFallar = false
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(screen.getByText('contenido del hueco')).toBeTruthy()
    expect(screen.queryByText(/No pudimos mostrar/)).toBeNull()
  })

  it('sin fallo, dibuja el contenido tal cual', () => {
    debeFallar = false
    render(
      <LimiteDelHueco titulo="Notas">
        <Hueco />
      </LimiteDelHueco>,
    )
    expect(screen.getByText('contenido del hueco')).toBeTruthy()
  })
})
