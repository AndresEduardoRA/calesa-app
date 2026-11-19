import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter, type OnUrlUpdateFunction } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BotonDeCompartirDeLaFila } from './boton-de-compartir-de-la-fila'

const ID = '00000000-0000-4000-8000-000000000001'

const montar = (alCambiar: OnUrlUpdateFunction = () => undefined) =>
  render(
    <NuqsTestingAdapter onUrlUpdate={alCambiar}>
      <BotonDeCompartirDeLaFila cotizacionId={ID} />
    </NuqsTestingAdapter>,
  )

afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('live')
})

describe('<BotonDeCompartirDeLaFila>', () => {
  it('abre «Compartir» de esa cotización por la URL', async () => {
    const alCambiar = vi.fn<OnUrlUpdateFunction>()
    montar(alCambiar)
    fireEvent.click(screen.getByRole('button', { name: 'Compartir' }))
    await waitFor(() => {
      expect(alCambiar).toHaveBeenCalled()
    })
    const url = alCambiar.mock.calls.at(-1)?.[0].searchParams
    expect(url?.get('panel')).toBe('compartir')
    expect(url?.get('para')).toBe(ID)
  })

  it('en Modo Live no se ofrece', () => {
    document.documentElement.classList.add('live')
    montar()
    expect(screen.queryByRole('button', { name: 'Compartir' })).toBeNull()
  })
})
