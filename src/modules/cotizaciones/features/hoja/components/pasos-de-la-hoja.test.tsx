import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { respuestaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import { ContextoDeLaVistaPrevia } from './hueco-de-la-vista-previa'
import { PasosDeLaHoja, type PasosDeLaPagina } from './pasos-de-la-hoja'

const PASOS: PasosDeLaPagina = {
  vehiculo: { panel: 'vehiculo', elegido: false, obligatorio: true },
  cliente: { panel: 'cliente', elegido: true, obligatorio: true },
}

function montar({ pasos = PASOS, vistaPrevia = true, busqueda = '' } = {}) {
  const cambios = vi.fn<(e: UrlUpdateEvent) => void>()
  const nav = <PasosDeLaHoja pasos={pasos} respuesta={respuestaDePrueba()} />
  render(
    <NuqsTestingAdapter searchParams={busqueda} onUrlUpdate={cambios}>
      {vistaPrevia ? (
        <ContextoDeLaVistaPrevia value={{ dibujar: () => null } as never}>
          {nav}
        </ContextoDeLaVistaPrevia>
      ) : (
        nav
      )}
    </NuqsTestingAdapter>,
  )
  return cambios
}

afterEach(cleanup)

describe('PasosDeLaHoja', () => {
  it('«Hoja · Vehículo · Cliente · Vista previa», con el punto en texto y en `title`', () => {
    montar()
    const nav = screen.getByRole('navigation', { name: 'Pasos de la hoja' })
    const botones = [...nav.querySelectorAll('button')]
    expect(botones.map((b) => b.getAttribute('title'))).toEqual([
      'Hoja',
      'Vehículo: obligatorio que falta',
      'Cliente: elegido',
      'Vista previa',
    ])
    expect(
      screen.getByRole('button', { name: 'Vehículo: obligatorio que falta' }).dataset['punto'],
    ).toBe('obligatorio_que_falta')
  })

  it('«Vehículo» abre su panel por la URL', async () => {
    const cambios = montar()
    fireEvent.click(screen.getByRole('button', { name: /^Vehículo/ }))
    await waitFor(() => {
      expect(cambios.mock.calls.at(-1)?.[0].searchParams.get('panel')).toBe('vehiculo')
    })
  })

  it('«Hoja» cierra lo abierto (el panel y el ⚙ de la cabecera)', async () => {
    const cambios = montar({ busqueda: '?panel=vehiculo&ajuste=cabecera' })
    fireEvent.click(screen.getByRole('button', { name: 'Hoja' }))
    await waitFor(() => {
      expect(cambios).toHaveBeenCalled()
    })
    const url = cambios.mock.calls.at(-1)?.[0].searchParams
    expect(url?.get('panel')).toBeNull()
    expect(url?.get('ajuste')).toBeNull()
  })

  it('sin la vista previa ni los paneles, sólo «Hoja»', () => {
    montar({ pasos: { vehiculo: null, cliente: null }, vistaPrevia: false })
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Hoja'])
  })
})
