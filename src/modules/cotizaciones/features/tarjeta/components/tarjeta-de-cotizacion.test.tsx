import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { CalculoDeLaTarjeta } from '../../../entities/calculo-de-la-tarjeta'
import {
  geometriaDeLaTarjeta,
  type Geometria,
} from '../../../entities/tarjeta/geometria-de-la-tarjeta'
import {
  tarjetaDesde,
  type LecturaDeLaTarjeta,
} from '../../../entities/tarjeta/lectura-de-la-tarjeta'
import {
  calculoDePrueba,
  CONTEXTO_DE_PRUEBA,
  crudaDeLaTarjeta,
} from '../../../entities/tarjeta/tarjeta.soporte'
import { TarjetaDeCotizacion } from './tarjeta-de-cotizacion'

afterEach(cleanup)

function geometria(
  calculo: CalculoDeLaTarjeta = calculoDePrueba(),
  lectura: LecturaDeLaTarjeta | null = tarjetaDesde(crudaDeLaTarjeta()),
): Geometria {
  if (lectura === null) throw new Error('la tarjeta de prueba no se lee')
  return geometriaDeLaTarjeta({
    lectura,
    calculo,
    contexto: CONTEXTO_DE_PRUEBA,
    monedaBs: 'BOB',
    locale: 'es-BO',
  })
}

const dibujar = (g: Geometria = geometria()) =>
  render(<TarjetaDeCotizacion geometria={g} logo={CONTEXTO_DE_PRUEBA.logo} />)

const celda = (c: HTMLElement, id: string) => c.querySelector<HTMLElement>(`[data-celda="${id}"]`)

describe('<TarjetaDeCotizacion>', () => {
  it('es un grupo con su nombre y sus celdas van en el DOM en orden de lectura', () => {
    const { container } = dibujar()
    const tarjeta = screen.getByRole('group', { name: 'Tarjeta de la cotización' })
    expect(tarjeta.hasAttribute('data-tarjeta-de-cotizacion')).toBe(true)
    const ids = [...container.querySelectorAll('[data-celda]')].map((c) =>
      c.getAttribute('data-celda'),
    )
    expect(ids).toEqual(geometria().celdas.map((c) => c.id))
    expect(ids.slice(0, 5)).toEqual([
      'c_titulo',
      'c_fecha',
      'c_asesor_rotulo',
      'c_asesor',
      'c_logo',
    ])
  })

  it('cada celda dice su fila, su columna, su nodo y qué muestra, su variable y su color', () => {
    const { container } = dibujar()
    const remate = celda(container, 'c_remate_monto')
    expect(remate?.getAttribute('data-fila')).toBe('n_remate')
    expect(remate?.getAttribute('data-columna')).toBe('monto')
    expect(remate?.getAttribute('data-nodo')).toBe('remate')
    expect(remate?.getAttribute('data-mostrar')).toBe('monto')
    expect(remate?.getAttribute('data-color')).toBe('verde')
    expect(celda(container, 'c_asesor')?.getAttribute('data-variable')).toBe('asesor_nombre')
    // Un color que ya no está en el catálogo se dibuja `auto`: sin `data-color`.
    expect(celda(container, 'c_flete')?.hasAttribute('data-color')).toBe(false)
  })

  it('las posiciones y los colores van en línea: el hex del catálogo y el texto de más contraste', () => {
    const { container } = dibujar()
    const compra = celda(container, 'c_compra')
    expect(compra?.style.position).toBe('absolute')
    expect(compra?.style.top).toBe('50px')
    expect(compra?.style.height).toBe('25px')
    expect(compra?.style.background).toBe('rgb(49, 134, 155)')
    expect(compra?.style.color).toBe('rgb(255, 255, 255)')
    expect(compra?.style.fontWeight).toBe('600')
  })

  it('todo monto pasa por <Monto>; el total lleva `data-total-usd` y, con «Ver total Bs», su segunda línea', () => {
    const sin = dibujar()
    // Remate, flete, el total y la garantía (fees no aplica: su fila no se dibuja).
    expect(sin.container.querySelectorAll('[data-monto]')).toHaveLength(4)
    expect(sin.container.querySelector('[data-total-usd] [data-monto-valor]')).not.toBeNull()
    expect(sin.container.querySelector('[data-total-bs-de-la-tarjeta]')).toBeNull()
    cleanup()
    const con = dibujar(geometria(calculoDePrueba({ verTotalBs: true })))
    expect(
      con.container.querySelector('[data-total-usd] [data-total-bs-de-la-tarjeta] [data-monto]'),
    ).not.toBeNull()
  })

  it('los textos: variables, etiquetas, la nota con sus renglones y el logo de la empresa', () => {
    const { container } = dibujar()
    expect(celda(container, 'c_titulo')?.textContent).toBe('COTIZACIÓN A GASOLINA')
    expect(celda(container, 'c_asesor')?.textContent).toBe('Ana Pérez')
    expect(celda(container, 'c_nota')?.textContent).toBe(
      'Precios sujetos a cambio.\nNo incluye reparación.',
    )
    // Sólo el logo, sin el nombre al lado.
    const logo = celda(container, 'c_logo')
    expect(logo?.querySelector('img[data-logo-de-la-celda]')?.getAttribute('alt')).toBe('Calesa')
    expect(logo?.textContent).toBe('')
  })

  it('por omisión: `data-por-omision` y el total con «Total»', () => {
    const { container } = dibujar(geometria(calculoDePrueba(), { estado: 'sin_plantilla' }))
    expect(container.querySelector('[data-por-omision]')).not.toBeNull()
    expect(celda(container, 'c_total_concepto')?.textContent).toBe('Total')
    expect(container.querySelector('[data-total-usd] [data-monto]')).not.toBeNull()
    expect(screen.getByText('Toyota Hilux 2022')).toBeTruthy()
  })
})
