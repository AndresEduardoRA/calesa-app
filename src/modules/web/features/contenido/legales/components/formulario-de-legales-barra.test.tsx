import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LegalesDelSitio } from '../../../../entities/contenido/legales'
import { FormularioDeLegales } from './formulario-de-legales'

// La barra de cambios sin guardar de «Legales»: aparece al escribir, «Descartar» vuelve a lo guardado y ya no hay un «Guardar» suelto.
const ejecutar = vi.fn<(entrada: unknown) => Promise<unknown>>()
vi.mock('next-safe-action/hooks', () => ({
  useAction: () => ({ executeAsync: ejecutar, result: {}, isPending: false }),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('../actions/guardar-legales', () => ({ guardarLegales: {} }))
vi.mock('@/shared/ui/toasts', () => ({
  avisar: vi.fn(),
  avisarError: vi.fn(),
  avisarExito: vi.fn(),
}))
// El editor es de Tiptap y no se prueba aquí: un campo de texto lo reemplaza.
vi.mock('../../editor/components/editor-diferido', () => ({
  EditorDeDocumentoDiferido: () => null,
}))

const LEGALES: LegalesDelSitio = {
  terminos: {
    titulo: 'Términos y condiciones',
    doc: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hola' }] }],
    },
    actualizadoEn: '2026-10-12T14:00:00+00:00',
  },
  privacidad: null,
  actualizadoEn: '2026-10-12T14:00:00.123456+00:00',
}

const barra = () => screen.queryByRole('region', { name: 'Cambios sin guardar' })
const titulo = () => screen.getAllByLabelText<HTMLInputElement>('Título')[0]!

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
})

describe('FormularioDeLegales: barra de cambios sin guardar', () => {
  it('no está al cargar, y no hay un «Guardar» suelto', async () => {
    render(<FormularioDeLegales legales={LEGALES} />)
    await waitFor(() => {
      expect(barra()).toBeNull()
    })
    expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull()
  })

  it('aparece al cambiar un título y «Descartar» lo repone', async () => {
    render(<FormularioDeLegales legales={LEGALES} />)
    fireEvent.change(titulo(), { target: { value: 'Otros términos' } })
    await waitFor(() => {
      expect(barra()).not.toBeNull()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    await waitFor(() => {
      expect(barra()).toBeNull()
    })
    expect(titulo().value).toBe('Términos y condiciones')
  })

  it('volver a escribir lo guardado la quita', async () => {
    render(<FormularioDeLegales legales={LEGALES} />)
    fireEvent.change(titulo(), { target: { value: 'Otros términos' } })
    await waitFor(() => {
      expect(barra()).not.toBeNull()
    })
    fireEvent.change(titulo(), { target: { value: 'Términos y condiciones' } })
    await waitFor(() => {
      expect(barra()).toBeNull()
    })
  })
})
