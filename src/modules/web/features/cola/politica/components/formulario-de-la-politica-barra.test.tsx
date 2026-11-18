import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PoliticaDeLaCola } from '../../../../entities/cola/politica'
import { FormularioDeLaPolitica } from './formulario-de-la-politica'

// La sección «Política de la cola» con su barra de cambios sin guardar: título y frase, la barra al cambiar, «Descartar» y ningún «Guardar política» suelto.
const ejecutar = vi.fn<(entrada: unknown) => Promise<unknown>>()
vi.mock('next-safe-action/hooks', () => ({
  useAction: () => ({ executeAsync: ejecutar, result: {}, isPending: false }),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('../actions/guardar-politica', () => ({ guardarPoliticaDeLaCola: {} }))
vi.mock('@/shared/ui/toasts', () => ({
  avisar: vi.fn(),
  avisarError: vi.fn(),
  avisarExito: vi.fn(),
}))

const POLITICA: PoliticaDeLaCola = {
  colaActiva: true,
  ttlContactoMinutos: 30,
  diasPegajoso: 14,
  maxAbiertasDefault: 5,
  maxIntentos: 3,
  whatsappRespaldo: '+59170000000',
  actualizadoEn: '2026-10-12T14:00:00.123456+00:00',
}

const barra = () => screen.queryByRole('region', { name: 'Cambios sin guardar' })
const minutos = () => screen.getByLabelText<HTMLInputElement>('Minutos para contactar')

afterEach(cleanup)

describe('FormularioDeLaPolitica', () => {
  it('lleva su título y su frase, sin barra ni «Guardar» suelto', () => {
    render(<FormularioDeLaPolitica politica={POLITICA} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Política de la cola' })).toBeTruthy()
    expect(
      screen.getByText(
        'Cuánto hay para contactar, cuántas abiertas por asesor y cuántos intentos.',
      ),
    ).toBeTruthy()
    expect(barra()).toBeNull()
    expect(screen.queryByRole('button', { name: /Guardar/ })).toBeNull()
  })

  it('la barra aparece al cambiar un número o el interruptor, y «Descartar» repone', () => {
    render(<FormularioDeLaPolitica politica={POLITICA} />)
    fireEvent.change(minutos(), { target: { value: '45' } })
    expect(barra()).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(barra()).toBeNull()
    expect(minutos().value).toBe('30')
    fireEvent.click(screen.getByRole('switch', { name: /La cola reparte turnos/ }))
    expect(barra()).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(barra()).toBeNull()
  })

  it('«Guardar» de la barra manda la política con la versión', async () => {
    ejecutar.mockResolvedValueOnce({ data: { ok: true } })
    render(<FormularioDeLaPolitica politica={POLITICA} />)
    fireEvent.change(minutos(), { target: { value: '45' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await vi.waitFor(() => {
      expect(ejecutar).toHaveBeenCalledTimes(1)
    })
    expect(ejecutar.mock.calls[0]?.[0]).toMatchObject({
      ttlContactoMinutos: 45,
      actualizadoEnEsperado: POLITICA.actualizadoEn,
    })
  })
})
