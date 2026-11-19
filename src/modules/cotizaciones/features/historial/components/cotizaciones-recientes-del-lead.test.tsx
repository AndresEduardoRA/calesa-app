import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import { codificarCursor, type Pagina } from '@/shared/lib/paginacion'
import type { CotizacionDelHistorial } from '../../../entities/historial-del-vehiculo'
import { CotizacionesRecientesDelLead } from './cotizaciones-recientes-del-lead'

type Respuesta = Resultado<Pagina<CotizacionDelHistorial>>
type Pedido = {
  leadId: string
  cursor: { instante: string } | null
  tamano?: number
  resolver: (r: Respuesta) => void
}
const pedidos: Pedido[] = []
vi.mock('../../../composicion-historial.client', () => ({
  leerCotizacionesDelLead: (pedido: Omit<Pedido, 'resolver'>) =>
    new Promise<Respuesta>((resolver) => {
      pedidos.push({ ...pedido, resolver })
    }),
}))

const LEAD = '00000000-0000-4000-8000-0000000000bb'
const idDe = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
const cotizacion = (i: number): CotizacionDelHistorial => ({
  id: idDe(i),
  numero: 1000 - i,
  clase: 'preventa',
  creadoEn: '2026-10-29T08:00:00+00:00',
  autor: 'Gala Guarda',
  aprobada: i === 1,
})
const cursorDe = (i: number) =>
  codificarCursor({ instante: '2026-10-29T08:00:00+00:00', id: idDe(i), sentido: 'siguiente' })
const pagina = (cuantas: number, siguiente: string | null = null): Respuesta => ({
  ok: true,
  data: {
    filas: Array.from({ length: cuantas }, (_, i) => cotizacion(i + 1)),
    siguiente,
    anterior: null,
  },
})
const error: Respuesta = { ok: false, error: { codigo: 'inesperado', mensaje: 'x' } }

beforeEach(() => {
  pedidos.length = 0
})
afterEach(cleanup)

const montar = () => render(<CotizacionesRecientesDelLead leadId={LEAD} />)
const responder = async (n: number, r: Respuesta) => {
  await waitFor(() => {
    expect(pedidos.length).toBeGreaterThanOrEqual(n)
  })
  pedidos[n - 1]?.resolver(r)
}
const filas = () =>
  screen.getByRole('list', { name: 'Cotizaciones del lead' }).querySelectorAll('li')
const verTodas = () => screen.queryByRole('link', { name: 'Ver todas' })

describe('CotizacionesRecientesDelLead: las 3 más recientes del lead', () => {
  it('lee una vez al montarse, sin cursor y de a 3, con el esqueleto mientras tanto', async () => {
    montar()
    expect(pedidos).toHaveLength(1)
    expect(pedidos[0]?.leadId).toBe(LEAD)
    expect(pedidos[0]?.cursor).toBeNull()
    expect(pedidos[0]?.tamano).toBe(3)
    expect(screen.getByLabelText('Cargando las cotizaciones')).toBeTruthy()
    await responder(1, pagina(3))
    await waitFor(() => {
      expect(filas()).toHaveLength(3)
    })
  })

  it('el vacío es una línea', async () => {
    montar()
    await responder(1, pagina(0))
    expect(await screen.findByText('Sin cotizaciones que puedas ver.')).toBeTruthy()
    expect(verTodas()).toBeNull()
  })

  it('3 sin más: las filas (con «Aprobada»), sin «Ver todas» ni «Ver más»', async () => {
    montar()
    await responder(1, pagina(3))
    await waitFor(() => {
      expect(filas()).toHaveLength(3)
    })
    expect(filas()[0]?.textContent).toContain('N.º 999')
    expect(filas()[0]?.textContent).toContain('Aprobada')
    expect(screen.getByRole('list').querySelector('li a')?.getAttribute('href')).toBe(
      `/cotizaciones/${idDe(1)}`,
    )
    expect(verTodas()).toBeNull()
    expect(screen.queryByRole('button', { name: 'Ver más' })).toBeNull()
  })

  it('3 con más: «Ver todas», sin número, lleva al listado del lead', async () => {
    montar()
    await responder(1, pagina(3, cursorDe(3)))
    await waitFor(() => {
      expect(filas()).toHaveLength(3)
    })
    expect(verTodas()?.getAttribute('href')).toBe(`/cotizaciones?lead=${LEAD}`)
    expect(verTodas()?.textContent).toBe('Ver todas')
    expect(pedidos).toHaveLength(1)
  })

  it('el error dice «No pudimos cargar «Cotizaciones».» y «Reintentar» vuelve a leer', async () => {
    montar()
    await responder(1, error)
    expect(await screen.findByText('No pudimos cargar «Cotizaciones».')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(pedidos).toHaveLength(2)
    expect(pedidos[1]?.tamano).toBe(3)
    await responder(2, pagina(1))
    expect(await screen.findByRole('list', { name: 'Cotizaciones del lead' })).toBeTruthy()
  })

  it('dentro de StrictMode cuenta sólo la última respuesta: 3 filas, no 6', async () => {
    render(
      <StrictMode>
        <CotizacionesRecientesDelLead leadId={LEAD} />
      </StrictMode>,
    )
    await waitFor(() => {
      expect(pedidos.length).toBeGreaterThanOrEqual(1)
    })
    for (const pedido of pedidos) {
      pedido.resolver(pagina(3, cursorDe(3)))
    }
    await waitFor(() => {
      expect(filas()).toHaveLength(3)
    })
  })
})
