import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter, type OnUrlUpdateFunction } from 'nuqs/adapters/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { zonasDeLaUnidad } from '../../../entities/nucleo/zonas'
import { abrirHueco } from '../hooks/eventos-de-la-unidad'
import type { SeccionDeLaUnidad } from './contenido-del-hueco'
import { ZonaDePestanas } from './zona-de-pestanas'

// Un contenido que anota cuántas veces se montó: lo no elegido no se monta; elegido, queda montado.
const montajes: string[] = []
function Contenido({ clave }: { clave: string }) {
  montajes.push(clave)
  return <p data-hueco={clave}>{`contenido de ${clave}`}</p>
}
const seccion = (clave: string, titulo: string): SeccionDeLaUnidad => ({
  clave,
  titulo,
  contenido: <Contenido clave={clave} />,
})

const zonas = zonasDeLaUnidad([
  seccion('documentos', 'Documentos'),
  seccion('transporte', 'Transporte'),
  seccion('gastos', 'Gastos'),
  seccion('pagos', 'Pagos'),
])

function dibujar(busqueda = '') {
  const alCambiarLaUrl = vi.fn<OnUrlUpdateFunction>()
  render(
    <div data-slot="panel-de-la-unidad">
      <NuqsTestingAdapter searchParams={busqueda} onUrlUpdate={alCambiarLaUrl} hasMemory>
        <ZonaDePestanas etiqueta="Secciones de la unidad" pestanas={zonas.pestanas} />
      </NuqsTestingAdapter>
    </div>,
  )
  return alCambiarLaUrl
}

const elegida = () =>
  screen.getAllByRole('tab').find((t) => t.getAttribute('aria-selected') === 'true')?.textContent

beforeEach(() => {
  montajes.length = 0
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  Element.prototype.scrollIntoView = () => {}
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('dos zonas que comparten ?hueco=', () => {
  it('elegir en la lateral no devuelve la de pestañas a su primera pestaña', async () => {
    const lateral = zonasDeLaUnidad([seccion('notas', 'Notas'), seccion('historial', 'Historial')])
    render(
      <div data-slot="panel-de-la-unidad">
        <NuqsTestingAdapter searchParams="?hueco=transporte" hasMemory>
          <ZonaDePestanas etiqueta="Secciones de la unidad" pestanas={zonas.pestanas} />
          <ZonaDePestanas etiqueta="Notas e historial" pestanas={lateral.lateral} />
        </NuqsTestingAdapter>
      </div>,
    )
    const delPrimero = () =>
      screen
        .getByRole('tablist', { name: 'Secciones de la unidad' })
        .querySelector('[aria-selected=true]')?.textContent
    expect(delPrimero()).toBe('Transporte')
    // «Notas» es la primera de su zona: escribe `hueco` en null.
    fireEvent.click(screen.getByRole('tab', { name: 'Notas' }))
    await waitFor(() => {
      expect(delPrimero()).toBe('Transporte')
    })
  })
})

describe('ZonaDePestanas', () => {
  it('abre en la primera y lo que no se eligió no se monta', () => {
    dibujar()
    expect(elegida()).toBe('Documentos')
    expect(montajes).toEqual(['documentos'])
    // Los envoltorios de todos los huecos existen desde el primer render (los atajos preguntan al DOM).
    expect(document.querySelectorAll('[data-bloque-del-hueco]')).toHaveLength(4)
  })

  it('elegir una pestaña monta su contenido, la escribe en la URL y, al volver, el anterior sigue montado', async () => {
    const alCambiarLaUrl = dibujar()
    fireEvent.click(screen.getByRole('tab', { name: 'Dinero' }))
    expect(elegida()).toBe('Dinero')
    expect(montajes).toEqual(['documentos', 'gastos', 'pagos'])
    await waitFor(() => {
      expect(alCambiarLaUrl).toHaveBeenCalledTimes(1)
    })
    const primero = alCambiarLaUrl.mock.calls[0]?.[0]
    expect(primero?.searchParams.get('hueco')).toBe('gastos')
    expect(primero?.options.shallow).toBe(true)
    expect(primero?.options.history).toBe('replace')
    fireEvent.click(screen.getByRole('tab', { name: 'Documentos' }))
    // Elegir la primera quita la clave y no vuelve a montar nada.
    await waitFor(() => {
      expect(alCambiarLaUrl).toHaveBeenCalledTimes(2)
    })
    expect(alCambiarLaUrl.mock.calls[1]?.[0].searchParams.get('hueco')).toBeNull()
    expect(montajes).toEqual(['documentos', 'gastos', 'pagos'])
  })

  it('?hueco=pagos entra en «Dinero»', () => {
    dibujar('?hueco=pagos')
    expect(elegida()).toBe('Dinero')
    expect(montajes).toContain('pagos')
  })

  it('?hueco=historial (de otra zona) no cambia la primera pestaña', () => {
    dibujar('?hueco=historial')
    expect(elegida()).toBe('Documentos')
  })

  it('abrirHueco(«pagos») elige «Dinero» y enfoca su pestaña', async () => {
    dibujar()
    act(() => {
      expect(abrirHueco('pagos')).toBe(true)
    })
    await waitFor(() => {
      expect(elegida()).toBe('Dinero')
    })
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Dinero' }))
    })
  })
})
