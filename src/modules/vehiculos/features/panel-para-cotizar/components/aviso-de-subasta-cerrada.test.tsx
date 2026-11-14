import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DatosDelAviso } from '../../../entities/subasta-cerrada'
import type { ResultadoDelRefresco } from '../../subasta/hooks/use-refresco-de-subasta'
import { AvisoDeSubastaCerrada } from './aviso-de-subasta-cerrada'

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }))

const consultar = vi.fn<() => Promise<ResultadoDelRefresco | null>>()
vi.mock('../../subasta/hooks/use-refresco-de-subasta', () => ({
  useRefrescoDeSubasta: () => ({ consultar, refrescar: vi.fn(), enCurso: false }),
  resumenDelRefresco: () => 'Subasta actualizada.',
}))

const marcar = vi.fn(() => Promise.resolve())
vi.mock('../../situacion/hooks/use-no-ganada', () => ({
  useNoGanada: () => ({ marcar, enviando: false, conflicto: null, error: null }),
}))
vi.mock('@/shared/ui/toasts', () => ({ avisarExito: vi.fn() }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const DATOS: DatosDelAviso = {
  vehiculoId: '00000000-0000-4000-8000-000000000001',
  origenId: '00000000-0000-4000-8000-0000000000aa',
  nombreDelOrigen: 'Subasta',
  situacion: 'sin_resolver',
  cierre: '2026-11-10T18:30:00.000Z',
  estadoDelPatio: null,
  actualizadoEn: '2026-11-10T19:00:00.000Z',
  entrada: '58540656',
  puedeRefrescar: true,
  puedeConfigurar: true,
  puedeResolver: true,
}

function montar(cambios: Partial<DatosDelAviso> = {}) {
  render(
    <AvisoDeSubastaCerrada
      datos={{ ...DATOS, ...cambios }}
      hrefLaGanamos="/logistica/x?ganada=si"
    />,
  )
}

const fallo = (
  cambios: Partial<Extract<ResultadoDelRefresco, { ok: false }>>,
): ResultadoDelRefresco => ({
  ok: false,
  mensaje: 'apibara no respondió.',
  reintentable: true,
  revisarIntegracion: false,
  conflicto: false,
  error: null,
  ...cambios,
})

describe('AvisoDeSubastaCerrada', () => {
  it('dice cuándo cerró la subasta y su situación, y ofrece las cuatro salidas', () => {
    montar()
    const aviso = screen.getByRole('region', { name: 'Subasta cerrada' })
    expect(aviso.textContent).toContain('La subasta de este vehículo cerró el')
    expect(aviso.textContent).toContain('Situación: Sin resolver.')
    for (const nombre of [
      'Refrescar la subasta',
      'No la ganamos',
      'Elegir otro vehículo',
      'Cotizar igual',
    ]) {
      expect(screen.getByRole('button', { name: nombre })).toBeTruthy()
    }
    expect(screen.getByRole('link', { name: 'La ganamos' }).getAttribute('href')).toBe(
      '/logistica/x?ganada=si',
    )
  })

  it('sin fecha lo dice sin fecha', () => {
    montar({ cierre: null })
    expect(screen.getByRole('region', { name: 'Subasta cerrada' }).textContent).toContain(
      'La subasta de este vehículo ya cerró.',
    )
  })

  it('sin permiso para refrescar o resolver no hay esos botones y se dice a quién pedirlo', () => {
    montar({ puedeRefrescar: false, puedeResolver: false })
    expect(screen.queryByRole('button', { name: 'Refrescar la subasta' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'No la ganamos' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'La ganamos' })).toBeNull()
    expect(screen.getByText(/pídeselo a quien administra los roles/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Elegir otro vehículo' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cotizar igual' })).toBeTruthy()
  })

  it('«En subasta» con el cierre vencido no nombra una situación ni ofrece resolver', () => {
    montar({ situacion: 'en_subasta' })
    const aviso = screen.getByRole('region', { name: 'Subasta cerrada' })
    expect(aviso.textContent).not.toContain('Situación')
    expect(screen.queryByRole('button', { name: 'No la ganamos' })).toBeNull()
  })

  it('«Cotizar igual» cierra el aviso', () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Cotizar igual' }))
    expect(screen.queryByRole('region', { name: 'Subasta cerrada' })).toBeNull()
  })

  it('«Elegir otro vehículo» abre el panel en «Cierre subasta»', () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Elegir otro vehículo' }))
    expect(push).toHaveBeenCalledTimes(1)
    const destino = String(push.mock.calls[0]?.[0])
    expect(destino).toContain('panel=vehiculo')
    expect(destino).toContain('lista=cierre')
  })

  it('«No la ganamos» marca y vuelve a leer la página', async () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'No la ganamos' }))
    await waitFor(() => {
      expect(refresh).toHaveBeenCalled()
    })
    expect(marcar).toHaveBeenCalledWith(true)
  })
})

describe('AvisoDeSubastaCerrada: refrescar la subasta', () => {
  it('«Refrescar la subasta» avisa que gasta cuota y no consulta hasta confirmar', async () => {
    consultar.mockResolvedValue({ ok: true, actualizados: 3, conservados: [] })
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Refrescar la subasta' }))
    expect(screen.getByText(/gasta cuota/)).toBeTruthy()
    expect(consultar).not.toHaveBeenCalled()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sí, refrescar' }))
      await Promise.resolve()
    })
    expect(consultar).toHaveBeenCalledTimes(1)
    expect(refresh).toHaveBeenCalled()
  })

  it('«No, volver» deja todo como estaba sin consultar', () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Refrescar la subasta' }))
    fireEvent.click(screen.getByRole('button', { name: 'No, volver' }))
    expect(consultar).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Refrescar la subasta' })).toBeTruthy()
  })

  it('un fallo del momento ofrece «Reintentar» y vuelve a consultar', async () => {
    consultar.mockResolvedValueOnce(fallo({}))
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Refrescar la subasta' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sí, refrescar' }))
    expect(await screen.findByText('apibara no respondió.')).toBeTruthy()
    consultar.mockResolvedValueOnce({ ok: true, actualizados: 0, conservados: [] })
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => {
      expect(consultar).toHaveBeenCalledTimes(2)
    })
  })

  it('sin cuota no ofrece «Reintentar» y manda a Integraciones a quien puede', async () => {
    consultar.mockResolvedValueOnce(
      fallo({ mensaje: 'Se acabó la cuota.', reintentable: false, revisarIntegracion: true }),
    )
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Refrescar la subasta' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sí, refrescar' }))
    expect(await screen.findByText('Se acabó la cuota.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Ir a Integraciones' }))
    expect(String(push.mock.calls[0]?.[0])).toContain('integraciones')
  })

  it('sin permiso para configurar, la cuota agotada no ofrece Integraciones', async () => {
    consultar.mockResolvedValueOnce(
      fallo({ mensaje: 'Se acabó la cuota.', reintentable: false, revisarIntegracion: true }),
    )
    montar({ puedeConfigurar: false })
    fireEvent.click(screen.getByRole('button', { name: 'Refrescar la subasta' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sí, refrescar' }))
    expect(await screen.findByText('Se acabó la cuota.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Ir a Integraciones' })).toBeNull()
  })

  it('un conflicto vuelve a leer la página antes de reintentar', async () => {
    consultar.mockResolvedValueOnce(
      fallo({ mensaje: 'Ana cambió este vehículo.', conflicto: true }),
    )
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Refrescar la subasta' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sí, refrescar' }))
    expect(await screen.findByText('Ana cambió este vehículo.')).toBeTruthy()
    expect(refresh).toHaveBeenCalled()
  })
})
