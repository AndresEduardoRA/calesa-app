import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { CalculoDeLaTarjeta } from '../../../../entities/calculo-de-la-tarjeta'
import type { LecturaEnCuadricula } from '../../../../entities/cuadricula-de-la-tarjeta'
import { TarjetaEnVivo } from './tarjeta-en-vivo'

afterEach(cleanup)

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
      },
      {
        id: 'c_fees_monto',
        fila: 'n_fees',
        columna: 'monto',
        contenido: { tipo: 'dato', nodo: 'fees', mostrar: 'monto' },
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
    { id: 'fees', etiqueta: 'Fees', descripcion: null, grupo: null, pct: null },
    { id: 'total', etiqueta: 'TOTAL', descripcion: null, grupo: null, pct: null },
  ],
  grupos: [],
  tiposDeCambio: { buckets: [], modos: [] },
  modos: [],
  variante: null,
  colores: [],
  total: { nodo: 'total' },
}

const calculo = (extra: Partial<CalculoDeLaTarjeta> = {}): CalculoDeLaTarjeta => ({
  valores: new Map([['fees', 250]]),
  estados: new Map([
    ['fees', 'activo'],
    ['total', 'activo'],
  ]),
  totales: { usd: 250, bs: null },
  modoTc: null,
  verTotalBs: false,
  ...extra,
})

const textoDe = (id: string) =>
  document.querySelector(`[data-celda="${id}"]`)?.textContent.replace(/\s/g, ' ') ?? null

describe('TarjetaEnVivo', () => {
  it('dibuja la plantilla de trabajo con las cifras de la unidad, no la tarjeta por omisión', () => {
    render(<TarjetaEnVivo lectura={LECTURA} calculo={calculo()} monedaBs={null} />)
    const tarjeta = screen.getByRole('group', { name: 'Tarjeta de la cotización' })
    expect(tarjeta.hasAttribute('data-por-omision')).toBe(false)
    expect(textoDe('c_fees')).toBe('Fees')
    expect(textoDe('c_fees_monto')).toContain('250')
    expect(textoDe('c_total_monto')).toContain('250')
  })

  it('sin cifras: las filas a la vista con «—» en los montos', () => {
    render(
      <TarjetaEnVivo
        lectura={LECTURA}
        calculo={calculo({ valores: new Map(), totales: { usd: null, bs: null } })}
        monedaBs={null}
      />,
    )
    expect(textoDe('c_fees')).toBe('Fees')
    expect(textoDe('c_fees_monto')).toBe('—')
    expect(textoDe('c_total_monto')).toBe('—')
  })

  it('una fila cuyo nodo no aplica no se dibuja', () => {
    render(
      <TarjetaEnVivo
        lectura={LECTURA}
        calculo={calculo({
          estados: new Map([
            ['fees', 'condicion_apagada'],
            ['total', 'activo'],
          ]),
        })}
        monedaBs={null}
      />,
    )
    expect(textoDe('c_fees')).toBeNull()
  })
})
