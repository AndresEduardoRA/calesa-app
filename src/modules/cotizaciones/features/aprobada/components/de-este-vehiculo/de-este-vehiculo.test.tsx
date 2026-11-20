import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing'
import type { ReactElement } from 'react'
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
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('../../hooks/aprobar-la-cotizacion', () => ({
  aprobarLaCotizacion: h.aprobar,
  aprobarHaciendolaPublica: vi.fn(),
}))

import { DeEsteVehiculo } from './de-este-vehiculo'

// La pregunta de aprobar una privada vive en la URL (nuqs).
const pintar = (ui: ReactElement) => render(ui, { wrapper: withNuqsTestingAdapter() })

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
  pintar(
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
  it('si falla la relectura tras aprobar, «Reintentar» vuelve a pedir la primera página', async () => {
    h.aprobar.mockImplementation((pedido: { alCambiar: (a: boolean, id: string) => void }) => {
      pedido.alCambiar(true, idDe(3))
      return Promise.resolve()
    })
    const cursor = codificarCursor({
      instante: fila(2).creadoEn,
      id: idDe(2),
      sentido: 'siguiente',
    })
    montar()
    await responder(1, leida([fila(3), fila(2)], null, cursor))
    fireEvent.click(
      (await screen.findAllByRole('button', { name: 'Aprobar esta' }))[0] as HTMLElement,
    )
    await responder(2, { ok: false, error: { codigo: 'inesperado', mensaje: 'x' } })
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }))
    await waitFor(() => {
      expect(pedidos).toHaveLength(3)
    })
    expect(pedidos[2]?.cursor).toBeNull()
  })

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

  it('con `vacio`, sin ninguna dice ese texto; sin él, no dibuja nada', async () => {
    pintar(
      <DeEsteVehiculo
        vehiculo={{ id: VEHICULO, titulo: 'Toyota Hilux' }}
        aprobarEn="todos"
        vacio="Sin cotizaciones que puedas ver."
      />,
    )
    await responder(1, leida([]))
    expect(await screen.findByText('Sin cotizaciones que puedas ver.')).toBeTruthy()
    cleanup()
    const { container } = pintar(
      <DeEsteVehiculo vehiculo={{ id: VEHICULO, titulo: 'Toyota Hilux' }} aprobarEn="todos" />,
    )
    await responder(2, leida([]))
    await waitFor(() => {
      expect(screen.queryByLabelText('Cargando las cotizaciones de este vehículo')).toBeNull()
    })
    expect(container.textContent).toBe('')
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

describe('DeEsteVehiculo, las casillas de comparar', () => {
  const montarConCasillas = () =>
    pintar(
      <DeEsteVehiculo
        vehiculo={{ id: VEHICULO, titulo: 'Toyota Hilux' }}
        cotizacionActual={idDe(2)}
        aprobarEn="todos"
        conCasillas
        volverA={`/cotizaciones/${idDe(2)}`}
        conTitulo
      />,
    )
  const casilla = (n: number) =>
    screen.getByRole('checkbox', { name: `Comparar la n.º ${String(n)}` })

  it('«Comparar» en la fila del título, apagado hasta tener 2', async () => {
    montarConCasillas()
    await responder(
      1,
      leida([fila(4), fila(3), fila(2), fila(1, { aprobada: true })], fila(1, { aprobada: true })),
    )
    const comparar = (await screen.findByRole('button', { name: 'Comparar' })) as HTMLButtonElement
    expect(comparar.disabled).toBe(true)
    expect(
      document.getElementById(comparar.getAttribute('aria-describedby') ?? '')?.textContent,
    ).toBe('Elige 2 o 3 para comparar.')
    fireEvent.click(casilla(3))
    expect(screen.getByRole('button', { name: 'Comparar' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'De este vehículo' })).toBeTruthy()
  })

  it('con una ranura del servidor, «Comparar» va ahí (un portal)', async () => {
    const ranura = document.createElement('div')
    ranura.id = 'ranura-de-prueba'
    document.body.append(ranura)
    pintar(
      <DeEsteVehiculo
        vehiculo={{ id: VEHICULO, titulo: 'Toyota Hilux' }}
        cotizacionActual={idDe(2)}
        aprobarEn="todos"
        conCasillas
        ranuraDeComparar="ranura-de-prueba"
      />,
    )
    await responder(1, leida([fila(3), fila(2)]))
    await waitFor(() => {
      expect(within(ranura).getByRole('button', { name: 'Comparar' })).toBeTruthy()
    })
    ranura.remove()
  })

  it('con 2, un enlace en el orden de la lista con `returnTo`; con 3, las demás apagadas y el tope dicho', async () => {
    montarConCasillas()
    await responder(
      1,
      leida([fila(4), fila(3), fila(2), fila(1, { aprobada: true })], fila(1, { aprobada: true })),
    )
    await screen.findByRole('button', { name: 'Comparar' })
    fireEvent.click(casilla(3))
    fireEvent.click(casilla(1))
    expect(screen.getByRole('link', { name: 'Comparar' }).getAttribute('href')).toBe(
      `/cotizaciones/comparar?ids=${idDe(1)},${idDe(3)}&returnTo=%2Fcotizaciones%2F${idDe(2)}`,
    )
    fireEvent.click(casilla(4))
    expect(screen.getByText('Puedes comparar hasta 3.')).toBeTruthy()
    const cuarta = casilla(2)
    expect(
      cuarta.getAttribute('aria-disabled') === 'true' || cuarta.hasAttribute('data-disabled'),
    ).toBe(true)
    expect(
      document.getElementById(cuarta.getAttribute('aria-describedby') ?? '')?.textContent,
    ).toBe('Puedes comparar hasta 3.')
  })
})
