import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import { codificarCursor, TOPE_DE_ESTE_VEHICULO } from '@/shared/lib/paginacion'
import type {
  FilaDeEsteVehiculo,
  PaginaLeidaDeEsteVehiculo,
} from '../../../../entities/aprobada/de-este-vehiculo'

type Respuesta = Resultado<PaginaLeidaDeEsteVehiculo>
const pedidos: { cursor: unknown; resolver: (r: Respuesta) => void }[] = []
const h = vi.hoisted(() => ({ aprobar: vi.fn() }))
vi.mock('../../../../areas/aprobada/composicion.client', () => ({
  leerDeEsteVehiculo: (pedido: { cursor: unknown }) =>
    new Promise<Respuesta>((resolver) => {
      pedidos.push({ cursor: pedido.cursor, resolver })
    }),
}))
vi.mock('../../hooks/aprobar-la-cotizacion', () => ({ aprobarLaCotizacion: h.aprobar }))

import { DeEsteVehiculo } from './de-este-vehiculo'

const VEHICULO = '00000000-0000-4000-8000-0000000000aa'
const ORIGEN = '00000000-0000-4000-8000-0000000000a1'
const idDe = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
const fila = (i: number, extra: Partial<FilaDeEsteVehiculo> = {}): FilaDeEsteVehiculo => ({
  id: idDe(i),
  numero: i,
  origenId: ORIGEN,
  origen: 'Japón',
  clase: 'preventa',
  estado: 'activa',
  titulo: null,
  totalBase: 1000,
  monedaMostrar: 'USD',
  modo: 'Paralelo',
  autor: 'Ana',
  creadoEn: '2026-11-17T10:00:00.123456+00:00',
  actualizadoEn: '2026-11-17T10:00:00.654321+00:00',
  vencida: false,
  aprobada: false,
  ...extra,
})
const leida = (
  filas: FilaDeEsteVehiculo[],
  fijada: FilaDeEsteVehiculo | null = null,
  siguiente: string | null = null,
): Respuesta => ({ ok: true, data: { fijada, filas, siguiente } })

beforeEach(() => {
  pedidos.length = 0
  h.aprobar.mockReset()
})
afterEach(cleanup)

const montar = (aprobarEn: 'todos' | readonly string[] = 'todos', actual = idDe(2)) =>
  render(
    <DeEsteVehiculo
      vehiculo={{ id: VEHICULO, titulo: 'Toyota Hilux' }}
      cotizacionActual={actual}
      aprobarEn={aprobarEn}
    />,
  )
const responder = async (n: number, r: Respuesta) => {
  await waitFor(() => {
    expect(pedidos.length).toBeGreaterThanOrEqual(n)
  })
  pedidos[n - 1]?.resolver(r)
}
const filas = () => screen.getAllByRole('listitem')

describe('DeEsteVehiculo', () => {
  it('la aprobada primero y marcada; «Esta» sin «Abrir»; las demás con «Aprobar esta» y «Abrir»', async () => {
    montar()
    expect(screen.getByLabelText('Cargando las cotizaciones de este vehículo')).toBeTruthy()
    await responder(
      1,
      leida([fila(3), fila(2), fila(1, { aprobada: true })], fila(1, { aprobada: true })),
    )
    const [primera, segunda, tercera] = await waitFor(() => {
      const todas = filas()
      expect(todas).toHaveLength(3)
      return todas
    })
    expect(primera?.hasAttribute('data-aprobada')).toBe(true)
    expect(
      within(primera as HTMLElement).queryByRole('button', { name: 'Aprobar esta' }),
    ).toBeNull()
    expect(segunda?.textContent).toContain('N.º 3 · Toyota Hilux')
    expect(tercera?.hasAttribute('data-esta')).toBe(true)
    expect(within(tercera as HTMLElement).getByText('Esta')).toBeTruthy()
    expect(within(tercera as HTMLElement).queryByRole('link', { name: 'Abrir' })).toBeNull()
    expect(
      within(tercera as HTMLElement).getByRole('button', { name: 'Aprobar esta' }),
    ).toBeTruthy()
    expect(
      within(segunda as HTMLElement)
        .getByRole('link', { name: 'Abrir' })
        .getAttribute('href'),
    ).toBe(`/cotizaciones/${idDe(3)}`)
  })

  it('sin permiso en el origen: apagado con su motivo al lado', async () => {
    montar([])
    await responder(1, leida([fila(3), fila(2)]))
    const boton = (
      await screen.findAllByRole('button', { name: 'Aprobar esta' })
    )[0] as HTMLButtonElement
    expect(boton.disabled).toBe(true)
    const motivo = document.getElementById(boton.getAttribute('aria-describedby') ?? '')
    expect(motivo?.textContent).toBe(
      'Para aprobar hace falta permiso en «Japón»: pídeselo a quien administra los roles.',
    )
  })

  it('«Aprobar esta» manda su versión, apaga el resto mientras va y, al entrar, relee la primera página', async () => {
    let terminar = () => {}
    h.aprobar.mockImplementation(
      (pedido: { alCambiar: (a: boolean, id: string) => void }) =>
        new Promise<void>((listo) => {
          terminar = () => {
            pedido.alCambiar(true, idDe(3))
            listo()
          }
        }),
    )
    montar()
    await responder(1, leida([fila(3), fila(2), fila(1, { aprobada: true })]))
    const botones = await screen.findAllByRole('button', { name: 'Aprobar esta' })
    fireEvent.click(botones[0] as HTMLElement)
    expect(h.aprobar).toHaveBeenCalledWith(
      expect.objectContaining({ id: idDe(3), numero: 3, actualizadoEn: fila(3).actualizadoEn }),
    )
    expect(screen.getByRole('button', { name: 'Aprobando…' })).toBeTruthy()
    expect(
      (screen.getByRole('button', { name: 'Aprobar esta' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    terminar()
    await waitFor(() => {
      expect(pedidos).toHaveLength(2)
    })
    expect(pedidos[1]?.cursor).toBeNull()
    await responder(
      2,
      leida([fila(3, { aprobada: true }), fila(2), fila(1)], fila(3, { aprobada: true })),
    )
    await waitFor(() => {
      expect(filas()[0]?.hasAttribute('data-aprobada')).toBe(true)
    })
  })
})

describe('DeEsteVehiculo, estados', () => {
  it('un error de lectura dice el texto con «Reintentar», que vuelve a pedir', async () => {
    montar()
    await responder(1, { ok: false, error: { codigo: 'inesperado', mensaje: 'x' } })
    expect(
      await screen.findByText('No pudimos cargar las cotizaciones de este vehículo.'),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => {
      expect(pedidos).toHaveLength(2)
    })
  })

  it('sin otras que la que se mira, no dibuja nada', async () => {
    const { container } = montar('todos', idDe(2))
    await responder(1, leida([fila(2, { aprobada: true })], fila(2, { aprobada: true })))
    await waitFor(() => {
      expect(container.textContent).toBe('')
    })
  })

  it('en el tope no pide más: «Ver todas en Cotizaciones» al listado del vehículo', async () => {
    const cursor = codificarCursor({
      instante: fila(1).creadoEn,
      id: idDe(1),
      sentido: 'siguiente',
    })
    montar()
    const muchas = Array.from({ length: TOPE_DE_ESTE_VEHICULO }, (_, i) => fila(i + 10))
    await responder(1, leida(muchas, null, cursor))
    const enlace = await screen.findByRole('link', { name: 'Ver todas en Cotizaciones' })
    expect(enlace.getAttribute('href')).toBe(`/cotizaciones?vehiculo=${VEHICULO}`)
    expect(screen.queryByRole('button', { name: 'Ver más' })).toBeNull()
  })
})
