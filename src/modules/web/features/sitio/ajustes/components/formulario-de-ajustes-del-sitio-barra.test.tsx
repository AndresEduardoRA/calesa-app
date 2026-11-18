import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AjustesDelSitio } from '../../../../entities/sitio/ajustes'
import { FormularioDeAjustesDelSitio } from './formulario-de-ajustes-del-sitio'

// La barra de cambios sin guardar de «Ajustes»: cuándo aparece, qué repone «Descartar» y que ya no hay un «Guardar» suelto.
const ejecutar = vi.fn<(entrada: unknown) => Promise<unknown>>()
vi.mock('next-safe-action/hooks', () => ({
  useAction: () => ({ executeAsync: ejecutar, result: {}, isPending: false }),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('../actions/guardar-ajustes', () => ({ guardarAjustesDelSitio: {} }))
vi.mock('@/shared/ui/toasts', () => ({
  avisar: vi.fn(),
  avisarError: vi.fn(),
  avisarExito: vi.fn(),
}))

const AJUSTES: AjustesDelSitio = {
  nombreSitio: 'Autos del Sur',
  lema: null,
  whatsappRespaldo: null,
  horario: null,
  direccionPublica: null,
  redes: {},
  seo: {},
  mostrarMonedaSecundaria: false,
  origenesVisibles: ['o-1'],
  actualizadoEn: '2026-10-12T14:00:00.123456+00:00',
}
const ORIGENES = [
  { id: 'o-1', nombre: 'Dubái' },
  { id: 'o-2', nombre: 'Corea' },
]

function dibujar() {
  render(<FormularioDeAjustesDelSitio ajustes={AJUSTES} origenes={ORIGENES} conteos={{}} />)
}

const barra = () => screen.queryByRole('region', { name: 'Cambios sin guardar' })
const nombre = () => screen.getByLabelText<HTMLInputElement>('Nombre del sitio')

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
})

describe('FormularioDeAjustesDelSitio: barra de cambios sin guardar', () => {
  it('no está al cargar, y no hay un «Guardar» suelto', async () => {
    dibujar()
    await waitFor(() => {
      expect(barra()).toBeNull()
    })
    expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull()
  })

  it('aparece al tipear un texto', async () => {
    dibujar()
    fireEvent.input(nombre(), { target: { value: 'Otro nombre' } })
    await waitFor(() => {
      expect(barra()).not.toBeNull()
    })
  })

  it('aparece al tildar un origen, y se va al destildarlo', async () => {
    dibujar()
    const corea = screen.getByRole('checkbox', { name: /Corea/ })
    fireEvent.click(corea)
    await waitFor(() => {
      expect(barra()).not.toBeNull()
    })
    fireEvent.click(corea)
    await waitFor(() => {
      expect(barra()).toBeNull()
    })
  })

  it('aparece al cambiar la moneda secundaria', async () => {
    dibujar()
    fireEvent.click(screen.getByRole('switch', { name: /moneda secundaria/i }))
    await waitFor(() => {
      expect(barra()).not.toBeNull()
    })
  })

  it('«Descartar» repone los textos y las casillas, y la quita', async () => {
    dibujar()
    fireEvent.input(nombre(), { target: { value: 'Otro nombre' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /Corea/ }))
    await waitFor(() => {
      expect(barra()).not.toBeNull()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    await waitFor(() => {
      expect(barra()).toBeNull()
    })
    expect(nombre().value).toBe('Autos del Sur')
    expect(screen.getByRole('checkbox', { name: /Corea/ }).getAttribute('aria-checked')).toBe(
      'false',
    )
    expect(window.sessionStorage.getItem('borrador:ajustes-del-sitio')).toBeNull()
  })

  it('«Guardar» de la barra envía el formulario', async () => {
    ejecutar.mockResolvedValueOnce({ data: { ok: true } })
    dibujar()
    fireEvent.input(nombre(), { target: { value: 'Otro nombre' } })
    await waitFor(() => {
      expect(barra()).not.toBeNull()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => {
      expect(ejecutar).toHaveBeenCalledTimes(1)
    })
    expect(ejecutar.mock.calls[0]?.[0]).toMatchObject({
      nombreSitio: 'Otro nombre',
      actualizadoEnEsperado: AJUSTES.actualizadoEn,
    })
  })
})
