import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { withNuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ aprobar: vi.fn(), urls: [] as string[] }))

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('../hooks/aprobar-la-cotizacion', () => ({
  aprobarLaCotizacion: h.aprobar,
  aprobarHaciendolaPublica: vi.fn(),
}))

import { avisarAprobada } from '../hooks/aprobada-del-vehiculo'
import { BotonAprobar } from './boton-aprobar'

afterEach(cleanup)
beforeEach(() => {
  h.aprobar.mockReset()
  h.urls = []
})

const ID = '22222222-2222-4222-8222-222222222222'
const VERSION = '2026-11-14T10:00:00.123456+00:00'

const dibujar = (cambios: Partial<Parameters<typeof BotonAprobar>[0]> = {}) => {
  const Con = withNuqsTestingAdapter({
    onUrlUpdate: (e: UrlUpdateEvent) => {
      h.urls.push(e.queryString)
    },
  })
  return render(
    <Con>
      <BotonAprobar
        id={ID}
        numero={7}
        actualizadoEn={VERSION}
        aprobada={false}
        motivo={null}
        {...cambios}
      />
    </Con>,
  )
}

describe('BotonAprobar', () => {
  it('aprobada: dibuja la insignia y ningún botón', () => {
    dibujar({ aprobada: true })
    expect(screen.getByText('Aprobada')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('apagado dice su motivo y no llama a nada', () => {
    dibujar({ motivo: 'Para aprobarla, asígnale un vehículo.' })
    const boton = screen.getByRole('button', { name: 'Aprobar' })
    expect((boton as HTMLButtonElement).disabled).toBe(true)
    expect(boton.getAttribute('aria-describedby')).toBe(
      screen.getByText('Para aprobarla, asígnale un vehículo.').id,
    )
    fireEvent.click(boton)
    expect(h.aprobar).not.toHaveBeenCalled()
  })

  it('aprueba con su versión; mientras va queda apagado y, al entrar, pasa a la insignia', async () => {
    let terminar = () => {}
    h.aprobar.mockImplementation(
      (pedido: { alCambiar: (aprobada: boolean) => void }) =>
        new Promise<void>((listo) => {
          terminar = () => {
            pedido.alCambiar(true)
            listo()
          }
        }),
    )
    dibujar()
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }))
    expect(h.aprobar).toHaveBeenCalledWith(
      expect.objectContaining({ id: ID, numero: 7, actualizadoEn: VERSION }),
    )
    const enCurso = screen.getByRole('button', { name: 'Aprobando…' }) as HTMLButtonElement
    expect(enCurso.disabled).toBe(true)
    terminar()
    await waitFor(() => {
      expect(screen.getByText('Aprobada')).toBeTruthy()
    })
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('si no entra, el botón vuelve a estar disponible', async () => {
    h.aprobar.mockResolvedValue(undefined)
    dibujar()
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }))
    await waitFor(() => {
      expect((screen.getByRole('button', { name: 'Aprobar' }) as HTMLButtonElement).disabled).toBe(
        false,
      )
    })
  })

  it('se pone al día cuando otra isla del vehículo aprueba otra o la devuelve', () => {
    const VEHICULO = '33333333-3333-4333-8333-333333333333'
    const OTRA = '44444444-4444-4444-8444-444444444444'
    dibujar({ aprobada: true, vehiculoId: VEHICULO })
    act(() => {
      avisarAprobada({ vehiculoId: VEHICULO, aprobadaId: OTRA, fuente: 'bloque' })
    })
    expect(screen.getByRole('button', { name: 'Aprobar' })).toBeTruthy()
    act(() => {
      avisarAprobada({ vehiculoId: VEHICULO, aprobadaId: ID, fuente: 'bloque' })
    })
    expect(screen.getByText('Aprobada')).toBeTruthy()
  })
})

describe('BotonAprobar › una privada', () => {
  it('una privada dice «Aprobar…» y, sin aprobar todavía, abre la pregunta por la URL', async () => {
    dibujar({ privada: true })
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar…' }))
    expect(h.aprobar).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(h.urls).not.toHaveLength(0)
    })
    const url = new URLSearchParams(h.urls.at(-1))
    expect(url.get('panel')).toBe('aprobar-privada')
    expect(url.get('para')).toBe(ID)
    expect(url.get('desde')).toBe('guardada')
  })

  it('si la base dice que es privada (la marca no llegó), abre la misma pregunta', async () => {
    h.aprobar.mockImplementation((pedido: { alSerPrivada: () => void }) => {
      pedido.alSerPrivada()
      return Promise.resolve()
    })
    dibujar()
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }))
    await waitFor(() => {
      expect(new URLSearchParams(h.urls.at(-1)).get('panel')).toBe('aprobar-privada')
    })
  })
})
