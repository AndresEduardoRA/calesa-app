import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'

// El visor real llega por `diferido()`: aquí, uno que dice con qué se montó.
const visor = vi.hoisted(() => vi.fn())
vi.mock('./diferidos', () => ({
  VisorDeLaPortadaDiferido: (props: { pedidos: number; url: string }) => {
    visor(props)
    return <p>visor con {props.pedidos} pedidos</p>
  },
}))

import { PortadaDeLaCotizacion } from './portada-de-la-cotizacion'

const ID = '00000000-0000-4000-8000-000000000001'
const ALT = 'Vista previa de la cotización n.º 12'

const montar = (total: { valor: number } | null = { valor: 1234.5 }) =>
  render(
    <NuqsTestingAdapter>
      <PortadaDeLaCotizacion cotizacionId={ID} numero={12} total={total} />
    </NuqsTestingAdapter>,
  )
const imagen = () => screen.getByAltText(ALT)
// La URL que pide la imagen (jsdom la vuelve absoluta).
const pedida = () =>
  new URL(imagen().getAttribute('src') ?? '', 'http://localhost').pathname +
  new URL(imagen().getAttribute('src') ?? '', 'http://localhost').search
// `next/image` avisa la carga tras decodificarla: asíncrono.
const cargar = async () => {
  fireEvent.load(imagen())
  await waitFor(() => {
    expect(screen.queryByRole('status')).toBeNull()
  })
}

afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('live')
  visor.mockReset()
})

describe('<PortadaDeLaCotizacion>', () => {
  it('pide la imagen a su ruta, lazy; mientras carga, el recuadro con el total y «Preparando la vista previa…»', () => {
    montar()
    expect(pedida()).toBe(`/cotizaciones/${ID}/imagen`)
    expect(imagen().getAttribute('loading')).toBe('lazy')
    expect(screen.getByRole('status').textContent).toBe('Preparando la vista previa…')
    // El total, con <Monto> (el formato regional lo prueba `formato.ts`).
    expect(document.querySelector('[data-monto-valor]')?.textContent).toMatch(/1.?234/)
    expect(screen.getByRole('button', { name: /en grande/ })).toHaveProperty('disabled', true)
  })

  it('sin total, sólo el texto', () => {
    montar(null)
    expect(screen.getByRole('status')).toBeTruthy()
    expect(document.querySelector('[data-monto]')).toBeNull()
  })

  it('si falla, lo dice con «Reintentar», que la vuelve a pedir con otra URL', () => {
    montar()
    fireEvent.error(imagen())
    expect(screen.getByText('No se pudo cargar la vista previa.')).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(pedida()).toBe(`/cotizaciones/${ID}/imagen?intento=1`)
    expect(screen.getByRole('status').textContent).toBe('Preparando la vista previa…')
  })

  it('cargada, se ve sola y el clic la abre en el visor (que se monta recién ahí)', async () => {
    montar()
    await cargar()
    expect(visor).not.toHaveBeenCalled()
    fireEvent.click(
      screen.getByRole('button', { name: `Ver la ${ALT.toLocaleLowerCase('es')} en grande` }),
    )
    expect(screen.getByText('visor con 1 pedidos')).toBeTruthy()
    expect(visor).toHaveBeenLastCalledWith(
      expect.objectContaining({ url: `/cotizaciones/${ID}/imagen`, pedidos: 1 }),
    )
  })

  it('en Modo Live lleva «Oculto en Modo Live» y el clic no abre el visor', async () => {
    document.documentElement.classList.add('live')
    montar()
    await cargar()
    expect(screen.getByText('Oculto en Modo Live').hasAttribute('data-portada-oculta')).toBe(true)
    expect(imagen().hasAttribute('data-portada-imagen')).toBe(true)
    const boton = screen.getByRole('button', { name: /en grande/ })
    expect(boton).toHaveProperty('disabled', true)
    fireEvent.click(boton)
    expect(visor).not.toHaveBeenCalled()
  })
})
