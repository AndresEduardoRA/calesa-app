import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LecturaEnCuadricula } from '../../../entities/cuadricula-de-la-tarjeta'
import type { ReferenciaDeLaTarjeta } from '../../../entities/referencia-de-la-tarjeta'
import { CONTEXTO_DE_EJEMPLO } from '../../../entities/tarjeta/vista-previa-de-ejemplo'
import type { GeometriaParaEditar } from '../../../entities/vista-previa-de-la-plantilla'
import { LienzoDeLaPlantilla } from './lienzo-de-la-plantilla'
import { OcultasDeLaTarjeta } from './ocultas-de-la-tarjeta'

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
// Una cotización de referencia cuya versión no tiene `fees` (su fila no se dibuja: «no está en la versión»).
const REFERENCIA: ReferenciaDeLaTarjeta = {
  estado: 'cotizacion',
  numero: 7,
  valores: [['total', 4321]],
  estados: [['total', 'activo']],
  totales: { usd: 4321, bs: null },
  modoTc: null,
  verTotalBs: false,
  monedaBs: null,
  contexto: { ...CONTEXTO_DE_EJEMPLO, numero: '7' },
}

describe('LienzoDeLaPlantilla', () => {
  it('sin referencia dibuja la cuadrícula con las cifras de ejemplo y el color del catálogo; sin capa, la tarjeta se lee (no va `aria-hidden`)', () => {
    const { container } = render(
      <LienzoDeLaPlantilla lectura={LECTURA} referencia={null} escala="ajustar" />,
    )
    const tarjeta = screen.getByRole('group', { name: 'Tarjeta de la cotización' })
    expect(tarjeta.getAttribute('aria-hidden')).toBeNull()
    expect(container.querySelector('[data-celda="c_fees"]')?.textContent).toBe('Fees')
    expect(container.querySelector('[data-celda="c_fees"]')?.getAttribute('data-color')).toBe(
      'verde',
    )
    // La fila n-ésima vale (n mod 8 + 1) × 250 y el total es la suma de los miembros.
    expect(container.querySelector('[data-total-usd] [data-monto-valor]')?.textContent).toContain(
      '250',
    )
  })

  it('con una referencia, sus cifras; la fila de un nodo que su versión no tiene llega a `debajo` como `fuera_de_la_version`', () => {
    const debajo = vi.fn((g: GeometriaParaEditar) => (
      <p data-ocultas-de-prueba="">{g.ocultas.length}</p>
    ))
    const { container } = render(
      <LienzoDeLaPlantilla
        lectura={LECTURA}
        referencia={REFERENCIA}
        escala="ajustar"
        debajo={debajo}
      />,
    )
    expect(container.querySelector('[data-celda="c_fees"]')).toBeNull()
    expect(container.querySelector('[data-total-usd] [data-monto-valor]')?.textContent).toContain(
      '4',
    )
    const g = debajo.mock.lastCall?.[0]
    expect(g?.ocultas).toEqual([
      {
        fila: 'n_fees',
        etiqueta: 'Fees',
        delNodo: 'Fees',
        motivo: 'fuera_de_la_version',
        variante: null,
      },
    ])
    expect(g?.filas.map((f) => f.id)).toEqual(['total'])
  })

  it('la capa recibe la geometría y la escala, va sobre la tarjeta en una caja con el margen, y la tarjeta dibujada queda `aria-hidden`', () => {
    const capa = vi.fn((g: GeometriaParaEditar, escala: number) => (
      <div data-capa-de-prueba="">
        {g.ancho}:{escala}
      </div>
    ))
    const { container } = render(
      <LienzoDeLaPlantilla
        lectura={LECTURA}
        referencia={{ estado: 'sin_cotizacion' }}
        escala="real"
        margen={{ arriba: 32, izquierda: 44 }}
        capa={capa}
      />,
    )
    expect(container.querySelector('[data-capa-de-prueba]')?.textContent).toBe('300:1')
    const [g, escala] = capa.mock.lastCall ?? []
    expect(escala).toBe(1)
    expect(g?.ancho).toBe(300)
    expect(g?.alto).toBe(25 + 54)
    const tarjeta = container.querySelector<HTMLElement>('[data-tarjeta-de-cotizacion]')
    expect(tarjeta?.getAttribute('aria-hidden')).toBe('true')
    expect(tarjeta?.style.left).toBe('44px')
    expect(tarjeta?.style.top).toBe('32px')
    const caja = tarjeta?.parentElement
    expect(caja?.style.width).toBe('344px')
    expect(caja?.style.height).toBe(`${String(32 + 25 + 54)}px`)
  })
})

describe('LienzoDeLaPlantilla con el tema oscuro', () => {
  it('la tarjeta se ve igual con el tema oscuro: el fondo y la tinta van en línea', () => {
    document.documentElement.classList.add('dark')
    try {
      const { container } = render(
        <LienzoDeLaPlantilla lectura={LECTURA} referencia={null} escala="ajustar" />,
      )
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
          {
            fila: 'n_fees',
            etiqueta: 'Honorarios',
            delNodo: 'Fees',
            motivo: 'no_aplica',
            variante: null,
          },
          { fila: 'n_grua', etiqueta: 'Grúa', delNodo: 'Grúa', motivo: 'cero', variante: null },
          {
            fila: 'n_flete',
            etiqueta: 'Flete',
            delNodo: 'Flete',
            motivo: 'fuera_de_la_version',
            variante: null,
          },
        ]}
      />,
    )
    expect(screen.getByText('Ocultas con esta referencia (3)')).toBeTruthy()
    expect(screen.getByText('Honorarios — «Fees» no está en esta referencia')).toBeTruthy()
    expect(screen.getByText('Grúa — «Grúa» vale 0')).toBeTruthy()
    expect(
      screen.getByText('Flete — «Flete» no está en la versión de esta cotización'),
    ).toBeTruthy()
    cleanup()
    const { container } = render(<OcultasDeLaTarjeta ocultas={[]} />)
    expect(container.innerHTML).toBe('')
  })
})
