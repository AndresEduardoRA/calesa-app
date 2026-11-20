import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { FilaDeEsteVehiculo } from '../../../../entities/aprobada/de-este-vehiculo'
import { AprobadaDelVehiculo } from './aprobada-del-vehiculo'

const ID = '00000000-0000-4000-8000-000000000001'

const FILA: FilaDeEsteVehiculo = {
  id: ID,
  numero: 42,
  origenId: '00000000-0000-4000-8000-0000000000c1',
  origen: 'Subasta',
  clase: 'preventa',
  estado: 'activa',
  titulo: null,
  totalBase: 12500,
  monedaMostrar: 'USD',
  modo: 'Paralelo',
  autor: 'Ana Rojas',
  creadoEn: '2026-11-17T12:00:00.000Z',
  actualizadoEn: '2026-11-17T12:00:00.000Z',
  vencida: false,
  venceEl: '2026-11-27',
  aprobada: true,
}

const montar = (fila: FilaDeEsteVehiculo | null, cotizar: string | null) =>
  render(
    <AprobadaDelVehiculo
      fila={fila}
      tituloDelVehiculo="Toyota Hilux 2021"
      cotizar={cotizar}
      imagen={<p>imagen</p>}
      compartir={<button type="button">Compartir</button>}
    />,
  )

afterEach(cleanup)

describe('<AprobadaDelVehiculo>', () => {
  it('con la aprobada: imagen, n.º con el título del vehículo, total con su modo, autor, «Abrir» y «Compartir»', () => {
    montar(FILA, '/cotizaciones/nuevo')
    expect(screen.getByText('imagen')).toBeTruthy()
    expect(screen.getByText('N.º 42 · Toyota Hilux 2021')).toBeTruthy()
    expect(screen.getByText(/· Paralelo/)).toBeTruthy()
    expect(document.querySelector('[data-monto-valor]')).not.toBeNull()
    expect(screen.getByText(/Ana Rojas/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Abrir' }).getAttribute('href')).toBe(
      `/cotizaciones/${ID}`,
    )
    expect(screen.getByRole('button', { name: 'Compartir' })).toBeTruthy()
    // Con aprobada no se ofrece cotizar.
    expect(screen.queryByRole('link', { name: 'Cotizar' })).toBeNull()
  })

  it('sin aprobada y con permiso de cotizar: «Sin cotización aprobada» y «Cotizar» a la hoja', () => {
    montar(null, '/cotizaciones/nuevo?origen=o&vehiculo=v')
    expect(screen.getByText('Sin cotización aprobada')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Cotizar' }).getAttribute('href')).toBe(
      '/cotizaciones/nuevo?origen=o&vehiculo=v',
    )
    expect(screen.queryByText('imagen')).toBeNull()
  })

  it('sin aprobada y sin permiso de cotizar: sin «Cotizar»', () => {
    montar(null, null)
    expect(screen.getByText('Sin cotización aprobada')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Cotizar' })).toBeNull()
  })
})
