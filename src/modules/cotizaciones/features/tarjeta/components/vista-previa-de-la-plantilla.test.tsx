import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { LecturaEnCuadricula } from '../../../entities/cuadricula-de-la-tarjeta'
import type { LecturaParaLaVistaPrevia } from '../../../entities/vista-previa-de-la-plantilla'
import { OcultasDeLaTarjeta } from './ocultas-de-la-tarjeta'
import { VistaPreviaDeLaPlantilla } from './vista-previa-de-la-plantilla'

afterEach(cleanup)

// Una cuadrícula chica: un miembro con su color, el total y la nota.
const LECTURA: LecturaEnCuadricula = {
  definicion: {
    forma: 2,
    columnas: [
      { id: 'concepto', ancho: 190 },
      { id: 'monto', ancho: 110 },
    ],
    filas: [
      { id: 'n_fees', alto: 25, ocultar_si: 'no_aplica', nodo: 'fees' },
      { id: 'total', alto: 54, ocultar_si: 'nunca' },
    ],
    celdas: [
      {
        id: 'c_fees',
        fila: 'n_fees',
        columna: 'concepto',
        contenido: { tipo: 'dato', nodo: 'fees', mostrar: 'etiqueta' },
        estilo: { fondo: 'verde' },
      },
      {
        id: 'c_fees_monto',
        fila: 'n_fees',
        columna: 'monto',
        contenido: { tipo: 'dato', nodo: 'fees', mostrar: 'monto' },
      },
      {
        id: 'c_total',
        fila: 'total',
        columna: 'concepto',
        contenido: { tipo: 'texto', texto: 'Total final' },
      },
      {
        id: 'c_total_monto',
        fila: 'total',
        columna: 'monto',
        contenido: { tipo: 'dato', nodo: 'total', mostrar: 'monto' },
      },
    ],
  },
  nodos: [
    { id: 'fees', etiqueta: 'Fees', descripcion: null, grupo: 'compra', pct: null },
    { id: 'total', etiqueta: 'TOTAL', descripcion: null, grupo: null, pct: null },
  ],
  grupos: [],
  tiposDeCambio: { buckets: [], modos: [] },
  modos: [],
  variante: null,
  colores: [{ clave: 'verde', hex: '#31869b' }],
  total: { nodo: 'total' },
}
const conDeMas = (filasDeMas: number): LecturaParaLaVistaPrevia => ({
  lectura: LECTURA,
  filasDeMas,
})

describe('VistaPreviaDeLaPlantilla', () => {
  it('dibuja la cuadrícula con cifras de ejemplo, el color del catálogo y «Cifras de ejemplo.»; con esas cifras nada se oculta', () => {
    const { container } = render(<VistaPreviaDeLaPlantilla lectura={conDeMas(0)} />)
    const seccion = screen.getByRole('region', { name: 'Vista previa de la tarjeta' })
    expect(seccion.textContent).toContain('Cifras de ejemplo.')
    expect(screen.getByRole('group', { name: 'Tarjeta de la cotización' })).toBeTruthy()
    expect(container.querySelector('[data-celda="c_fees"]')?.textContent).toBe('Fees')
    expect(container.querySelector('[data-celda="c_fees"]')?.getAttribute('data-color')).toBe(
      'verde',
    )
    expect(container.querySelector('[data-celda="c_total"]')?.textContent).toBe('Total final')
    // La fila n-ésima vale (n mod 8 + 1) × 250 y el total es la suma de los miembros.
    expect(container.querySelector('[data-total-usd] [data-monto-valor]')?.textContent).toContain(
      '250',
    )
    expect(screen.queryByText(/Ocultas con esta referencia/)).toBeNull()
    expect(screen.queryByText(/Se muestran las primeras/)).toBeNull()
  })

  it('avisa del tope sólo si quedaron filas fuera', () => {
    render(<VistaPreviaDeLaPlantilla lectura={conDeMas(496)} />)
    expect(screen.getByText('Se muestran las primeras 4 filas de cada grupo.')).toBeTruthy()
  })

  it('la tarjeta se ve igual con el tema oscuro: el fondo y la tinta van en línea', () => {
    document.documentElement.classList.add('dark')
    try {
      const { container } = render(<VistaPreviaDeLaPlantilla lectura={conDeMas(0)} />)
      const fees = container.querySelector<HTMLElement>('[data-celda="c_fees"]')
      expect(fees?.style.background).toBe('rgb(49, 134, 155)')
      expect(container.querySelector('style')).toBeNull()
    } finally {
      document.documentElement.classList.remove('dark')
    }
  })
})

describe('OcultasDeLaTarjeta', () => {
  it('«Ocultas con esta referencia (N)» con el motivo de cada una; sin ocultas no se dibuja', () => {
    render(
      <OcultasDeLaTarjeta
        ocultas={[
          { fila: 'n_fees', etiqueta: 'Honorarios', delNodo: 'Fees', motivo: 'no_aplica' },
          { fila: 'n_grua', etiqueta: 'Grúa', delNodo: 'Grúa', motivo: 'cero' },
        ]}
      />,
    )
    expect(screen.getByText('Ocultas con esta referencia (2)')).toBeTruthy()
    expect(screen.getByText('Honorarios — «Fees» no está en esta referencia')).toBeTruthy()
    expect(screen.getByText('Grúa — «Grúa» vale 0')).toBeTruthy()
    cleanup()
    const { container } = render(<OcultasDeLaTarjeta ocultas={[]} />)
    expect(container.innerHTML).toBe('')
  })
})
