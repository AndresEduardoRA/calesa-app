import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'

// El visor real llega por `diferido()`: aquí, uno que dice con qué se montó.
const visor = vi.hoisted(() => vi.fn())
vi.mock('./diferidos', () => ({
  VisorDeLaImagenDiferido: (props: { pedidos: number; url: string; clave: string }) => {
    visor(props)
    return <p>visor con {props.pedidos} pedidos</p>
  },
}))

import { ImagenDeLaTarjeta } from './imagen-de-la-tarjeta'

const ID = '00000000-0000-4000-8000-000000000001'
const ALT = 'Imagen de la tarjeta de la cotización n.º 12'

const montar = (
  total: { valor: number } | null = { valor: 1234.5 },
  { visor, lugar }: { visor?: string; lugar?: 'resumen' | 'lista' } = {},
) =>
  render(
    <NuqsTestingAdapter searchParams={visor === undefined ? {} : { visor }}>
      <ImagenDeLaTarjeta
        cotizacionId={ID}
        numero={12}
        total={total}
        {...(lugar === undefined ? {} : { lugar })}
      />
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

describe('<ImagenDeLaTarjeta>', () => {
  it('pide la imagen a su ruta, lazy; mientras carga, el recuadro con el total y «Preparando la imagen…»', () => {
    montar()
    expect(pedida()).toBe(`/cotizaciones/${ID}/imagen`)
    expect(imagen().getAttribute('loading')).toBe('lazy')
    expect(screen.getByRole('status').textContent).toBe('Preparando la imagen…')
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
    expect(screen.getByText('No se pudo armar la imagen.')).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(pedida()).toBe(`/cotizaciones/${ID}/imagen?intento=1`)
    expect(screen.getByRole('status').textContent).toBe('Preparando la imagen…')
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
      expect.objectContaining({
        url: `/cotizaciones/${ID}/imagen`,
        pedidos: 1,
        clave: `imagen-${ID}`,
      }),
    )
  })

  it('un enlace con la clave de antes (`portada-…`) monta el visor con esa clave; la de otro lugar, no', () => {
    montar(undefined, { visor: `portada-${ID}` })
    expect(visor).toHaveBeenLastCalledWith(
      expect.objectContaining({ clave: `portada-${ID}`, pedidos: 0 }),
    )
    cleanup()
    visor.mockReset()
    montar(undefined, { visor: `portada-${ID}`, lugar: 'lista' })
    expect(visor).not.toHaveBeenCalled()
  })

  it('en Modo Live lleva «Oculto en Modo Live» y el clic no abre el visor', async () => {
    document.documentElement.classList.add('live')
    montar()
    await cargar()
    expect(screen.getByText('Oculto en Modo Live').hasAttribute('data-imagen-oculta')).toBe(true)
    expect(imagen().hasAttribute('data-imagen')).toBe(true)
    const boton = screen.getByRole('button', { name: /en grande/ })
    expect(boton).toHaveProperty('disabled', true)
    fireEvent.click(boton)
    expect(visor).not.toHaveBeenCalled()
  })
})
