import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { celdaDe, dibujarLaPlanilla } from '../planilla-de-prueba.soporte'
import { EditorConReferencias } from './editor-con-referencias'
import { pintarElTexto } from './pintar-el-texto'

vi.mock('../../../actions/guardar-borrador', () => ({
  guardarBorrador: () => Promise.resolve(undefined),
}))
vi.mock('../../../../../areas/formula/composicion.client', () => ({
  leerElTerrenoDePrueba: () =>
    Promise.resolve({
      ok: true as const,
      data: { tipos_cambio: { oficial: 2 }, monedas: { oficial: 'BOB' }, tablas: {}, avisos: [] },
    }),
  leerTonosDelCatalogo: () => Promise.resolve({ ok: true as const, data: [] }),
}))
vi.mock('@/shared/ui/toasts', () => ({ avisar: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

const FILAS = [
  { id: 'comision', texto: '=remate*4%', etiqueta: 'Comisión' },
  { id: 'despacho', texto: '=900', etiqueta: 'Despacho' },
  { id: 'total', texto: '=comision+despacho', etiqueta: 'Total' },
]

// «C7» de la C de una fila.
const refDe = (id: string) => celdaDe(id, 'C').dataset['celda'] ?? ''
const entradaDelTotal = () =>
  screen.getByRole<HTMLInputElement>('combobox', { name: /^C\d+, Total, valor$/ })

// Elige la C del total y empieza a escribir «=» en ella, como desde el teclado.
function escribirEnElTotal() {
  fireEvent.click(celdaDe('total', 'C'))
  fireEvent.keyDown(screen.getByRole('grid'), { key: '=' })
  return entradaDelTotal()
}

beforeEach(() => {
  // jsdom no desplaza: la celda activa se lleva a la vista.
  Element.prototype.scrollIntoView = () => undefined
  window.sessionStorage.clear()
})
afterEach(cleanup)

describe('pintarElTexto', () => {
  it('cada referencia en su color, el tramo del error subrayado y lo demás sin pintar', () => {
    expect(
      pintarElTexto(
        '=C5+C7*2',
        [
          { desde: 1, hasta: 3, color: 0 },
          { desde: 4, hasta: 6, color: 1 },
        ],
        { desde: 6, largo: 2 },
      ),
    ).toEqual([
      { desde: 0, texto: '=', color: null, error: false },
      { desde: 1, texto: 'C5', color: 0, error: false },
      { desde: 3, texto: '+', color: null, error: false },
      { desde: 4, texto: 'C7', color: 1, error: false },
      { desde: 6, texto: '*2', color: null, error: true },
    ])
  })

  it('un tramo que pisa una referencia la parte; uno fuera del texto se ignora; el texto vacío no da pedazos', () => {
    expect(
      pintarElTexto('C5+1', [{ desde: 0, hasta: 2, color: 3 }], { desde: 1, largo: 2 }),
    ).toEqual([
      { desde: 0, texto: 'C', color: 3, error: false },
      { desde: 1, texto: '5', color: 3, error: true },
      { desde: 2, texto: '+', color: null, error: true },
      { desde: 3, texto: '1', color: null, error: false },
    ])
    expect(pintarElTexto('=1', [], { desde: 9, largo: 2 })).toEqual([
      { desde: 0, texto: '=1', color: null, error: false },
    ])
    expect(pintarElTexto('', [], null)).toEqual([])
  })
})

describe('EditorConReferencias', () => {
  it('el lector lee el textarea; la capa pintada repite el texto con el color de cada referencia y no se lee', () => {
    render(
      <EditorConReferencias
        aria-label="Fórmula de C9, Total"
        valor="=C5+C7"
        refs={[
          { desde: 1, hasta: 3, color: 0, texto: 'C5', col: 'C', numeros: [5] },
          { desde: 4, hasta: 6, color: 1, texto: 'C7', col: 'C', numeros: [7] },
        ]}
        tramoDelError={null}
        onChange={() => undefined}
      />,
    )
    expect(screen.getByRole('textbox', { name: 'Fórmula de C9, Total' })).toHaveProperty(
      'value',
      '=C5+C7',
    )
    const capa = document.querySelector('[aria-hidden]')
    const pintados = [...(capa?.querySelectorAll<HTMLElement>('span[style]') ?? [])]
    expect(pintados.map((s) => [s.textContent, s.style.color])).toEqual([
      ['C5', 'var(--viz-series-1)'],
      ['C7', 'var(--viz-series-2)'],
    ])
  })
})

describe('Referenciar con un clic (D15, D16)', () => {
  it('un clic inserta la referencia, otro la reemplaza y con Shift arma el rango; la leyenda y los bordes la siguen', () => {
    dibujarLaPlanilla(FILAS)
    const entrada = escribirEnElTotal()
    expect(entrada.value).toBe('=')
    fireEvent.click(celdaDe('comision', 'C'))
    expect(entradaDelTotal().value).toBe(`=${refDe('comision')}`)
    expect(document.querySelector('[data-leyenda-de-referencias]')?.textContent).toBe(
      `${refDe('comision')} Comisión`,
    )
    expect(celdaDe('comision', 'C').style.boxShadow).toContain('var(--viz-series-1)')
    fireEvent.click(celdaDe('despacho', 'C'))
    expect(entradaDelTotal().value).toBe(`=${refDe('despacho')}`)
    fireEvent.click(celdaDe('comision', 'C'), { shiftKey: true })
    expect(entradaDelTotal().value).toBe(`=${refDe('despacho')}:${refDe('comision')}`)
  })

  it('tras un operador, el clic suma otra referencia; donde no espera un operando, aplica y elige esa celda', () => {
    dibujarLaPlanilla(FILAS)
    escribirEnElTotal()
    fireEvent.click(celdaDe('comision', 'C'))
    fireEvent.change(entradaDelTotal(), { target: { value: `=${refDe('comision')}+` } })
    fireEvent.click(celdaDe('despacho', 'C'))
    const escrito = `=${refDe('comision')}+${refDe('despacho')}`
    expect(entradaDelTotal().value).toBe(escrito)
    fireEvent.change(entradaDelTotal(), { target: { value: `${escrito}*2` } })
    fireEvent.click(celdaDe('despacho', 'A'))
    expect(screen.queryByRole('combobox', { name: /Total, valor/ })).toBeNull()
    expect(screen.getByRole('grid').getAttribute('aria-activedescendant')).toBe(
      celdaDe('despacho', 'A').id,
    )
  })

  it('la sugerencia se acepta con Tab sin aplicar la celda', () => {
    dibujarLaPlanilla(FILAS)
    const entrada = escribirEnElTotal()
    fireEvent.change(entrada, { target: { value: '=SU' } })
    const lista = screen.getByRole('listbox', { name: 'Sugerencias' })
    expect(lista.textContent).toContain('SUMA')
    fireEvent.keyDown(entradaDelTotal(), { key: 'Tab' })
    expect(entradaDelTotal().value).toMatch(/^=SUMA\(/)
  })
})
