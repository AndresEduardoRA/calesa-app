import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '@/shared/lib/errores'
import { ProveedorAtajos } from '@/shared/ui/atajos'
import type { RecalculoInicial } from '../../../entities/apertura'
import { respuestaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import { hojaDeUnaGuardadaDesde } from '../../../entities/hoja-de-una-guardada-lectura'
import {
  crudaDeUnaGuardada,
  ID_DE_LA_COTIZACION,
} from '../../../entities/hoja-de-una-guardada.soporte'
import type { PedidoDeEdicion } from '../../../entities/pedido-de-edicion'
import type { PedidoDeRecalculo } from '../../../entities/pedido-de-recalculo'
import { PantallaDeUnaGuardada } from './pantalla-de-una-guardada'

const { recalcular, ejecutar, refrescar } = vi.hoisted(() => ({
  recalcular: vi.fn(),
  ejecutar: vi.fn(),
  refrescar: vi.fn(),
}))
vi.mock('../../../composicion.client', () => ({ recalcular }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: refrescar }) }))
vi.mock('next-safe-action/hooks', () => ({ useAction: () => ({ executeAsync: ejecutar }) }))
vi.mock('../actions/guardar-cotizacion', () => ({ guardarCotizacion: {} }))
vi.mock('../../encima/actions/cotizar-encima', () => ({ cotizarEncima: {} }))
vi.mock('../../encima/actions/cotizar-encima-en-par', () => ({ cotizarEncimaEnPar: {} }))

// Cambiar el vehículo de una preventa guardada (T315): la hoja calcula con el elegido (`?vehiculo=`), es un cambio que guardar, guardar lo manda y lo suelta de la URL sin ir al
// servidor; «Recargar» lo suelta yendo; el aviso de C11 no se dice con otro vehículo; uno que ya no se puede usar ofrece «Elegir otro vehículo».
const PERSONA = '3b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const NUEVO = '4b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const VALORES = { remate: 1000, variante: 'gasolina', cuenta: 0, total: 2350 }
const alDia = (usd: number): RecalculoInicial => ({
  respuesta: respuestaDePrueba({ usd, valores: { ...VALORES, total: usd } }),
  estado: { tipo: 'al_dia' },
})
const rechazo = (motivo: string, mensaje?: string) => ({
  data: { ok: true, data: { tipo: 'rechazo', motivo, ...(mensaje ? { mensaje } : {}) } },
})

function montar({
  vehiculoNuevo = NUEVO,
  inicial = alDia(2350),
  url = `?vehiculo=${NUEVO}`,
}: { vehiculoNuevo?: string | null; inicial?: RecalculoInicial; url?: string } = {}) {
  const hoja = hojaDeUnaGuardadaDesde(crudaDeUnaGuardada())
  if (!hoja) {
    throw new Error('La hoja de prueba no se leyó.')
  }
  const cambios: UrlUpdateEvent[] = []
  render(
    <PantallaDeUnaGuardada
      hoja={hoja}
      inicial={inicial}
      personaId={PERSONA}
      vehiculoNuevo={vehiculoNuevo}
      cambiaVehiculo
      panelDelTitulo="vehiculo"
    />,
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <NuqsTestingAdapter
          searchParams={url}
          hasMemory
          onUrlUpdate={(cambio) => cambios.push(cambio)}
        >
          <ProveedorAtajos>{children}</ProveedorAtajos>
        </NuqsTestingAdapter>
      ),
    },
  )
  return { cambios }
}
const guardar = () => screen.getByRole<HTMLButtonElement>('button', { name: 'Guardar' })

function tipear(nodo: string, texto: string) {
  const celda = document.querySelector(`[data-nodo="${nodo}"] [data-parada="0"]`)
  if (!celda) {
    throw new Error(`No hay la celda ${nodo}`)
  }
  fireEvent.click(celda)
  const entrada = document.querySelector<HTMLInputElement>(`[data-nodo="${nodo}"] input`)
  if (!entrada) {
    throw new Error('No se abrió la edición')
  }
  fireEvent.change(entrada, { target: { value: texto } })
  fireEvent.keyDown(entrada, { key: 'Enter' })
}

beforeEach(() => {
  window.sessionStorage.clear()
  recalcular.mockReset()
  ejecutar.mockReset()
  refrescar.mockReset()
  recalcular.mockResolvedValue(ok(respuestaDePrueba({ usd: 7, valores: { ...VALORES, total: 7 } })))
})
afterEach(cleanup)

describe('PantallaDeUnaGuardada › con otro vehículo (T315)', () => {
  it('elegir otro vehículo es un cambio: «Guardar» se enciende sin tipear', () => {
    montar()
    expect(guardar().disabled).toBe(false)
    expect(screen.queryByText('Sin cambios que guardar.')).toBeNull()
  })

  it('el recálculo pide la cotización con el vehículo elegido', async () => {
    montar()
    tipear('remate', '1200')
    await waitFor(() => {
      expect(recalcular).toHaveBeenCalled()
    })
    const pedido = recalcular.mock.calls[0]?.[0] as PedidoDeRecalculo
    expect(pedido.de).toEqual({
      tipo: 'guardada',
      cotizacionId: ID_DE_LA_COTIZACION,
      vehiculoId: NUEVO,
    })
  })

  it('guardar manda el vehículo elegido y que cambia; guardado, lo suelta de la URL sin ir al servidor', async () => {
    ejecutar.mockResolvedValue({
      data: {
        ok: true,
        data: {
          tipo: 'guardada',
          cotizacion: { id: ID_DE_LA_COTIZACION, numero: 41, totalUsd: 7, repetido: false },
        },
      },
    })
    const { cambios } = montar()
    fireEvent.click(guardar())
    await waitFor(() => {
      expect(ejecutar).toHaveBeenCalledTimes(1)
    })
    expect(ejecutar.mock.calls[0]?.[0] as PedidoDeEdicion).toMatchObject({
      cotizacionId: ID_DE_LA_COTIZACION,
      vehiculoId: NUEVO,
      cambiaElVehiculo: true,
    })
    await screen.findByText('Cambios guardados.')
    await waitFor(() => {
      expect(cambios.at(-1)?.queryString).toBe('')
    })
    expect(cambios.at(-1)?.options).toMatchObject({ history: 'replace', shallow: true })
  })

  it('sin vehículo elegido, nada cambia: «Guardar» apagado y el pedido no lo cambia', () => {
    montar({ vehiculoNuevo: null, url: '' })
    expect(guardar().disabled).toBe(true)
    expect(screen.getByText('Sin cambios que guardar.')).toBeTruthy()
  })
})

describe('PantallaDeUnaGuardada › con otro vehículo: avisos y «Recargar» (T315)', () => {
  it('con otro vehículo no dice el aviso de C11, pero sí el «Total guardado» si el total es otro', () => {
    montar({ inicial: alDia(3100) })
    expect(document.querySelector('[data-aviso-de-hoy]')).toBeNull()
    expect(document.querySelector('[data-total-cotizado]')).not.toBeNull()
  })

  it('un vehículo que ya no se puede usar lo dice y ofrece «Elegir otro vehículo»', async () => {
    ejecutar.mockResolvedValue(rechazo('vehiculo_sin_acceso'))
    montar()
    fireEvent.click(guardar())
    expect(
      await screen.findByText(
        'No se puede usar ese vehículo: ya no existe, está en la papelera o ya no tienes acceso.',
      ),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Elegir otro vehículo' })).toBeTruthy()
  })

  it('«Recargar» suelta el vehículo de la URL yendo al servidor, sin otro pedido de la página', async () => {
    ejecutar.mockResolvedValue(
      rechazo('version_cambiada', 'Ana cambió esta cotización hace 1 minuto.'),
    )
    const { cambios } = montar()
    fireEvent.click(guardar())
    fireEvent.click(await screen.findByRole('button', { name: 'Recargar' }))
    await waitFor(() => {
      expect(cambios.at(-1)?.queryString).toBe('')
    })
    expect(cambios.at(-1)?.options).toMatchObject({ history: 'replace', shallow: false })
    expect(refrescar).not.toHaveBeenCalled()
  })

  it('«Recargar» sin vehículo en la URL pide la página como siempre', async () => {
    ejecutar.mockResolvedValue(
      rechazo('version_cambiada', 'Ana cambió esta cotización hace 1 minuto.'),
    )
    montar({ vehiculoNuevo: null, url: '' })
    tipear('remate', '1200')
    await waitFor(() => {
      expect(guardar().disabled).toBe(false)
    })
    fireEvent.click(guardar())
    fireEvent.click(await screen.findByRole('button', { name: 'Recargar' }))
    expect(refrescar).toHaveBeenCalledTimes(1)
  })
})
