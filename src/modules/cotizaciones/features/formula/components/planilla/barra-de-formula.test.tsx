import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { formulaDePrueba } from '../../../../entities/formula/fila-de-prueba.soporte'
import type { FilaAbierta } from '../../hooks/use-editor-de-la-formula'
import { filasParaDibujar } from '../../hooks/use-editor-de-la-formula.soporte'
import { BarraDeFormula } from './barra-de-formula'

afterEach(cleanup)

const formula = formulaDePrueba([{ id: 'total', texto: '=remate+fees', etiqueta: 'Total' }])
const filas = filasParaDibujar(formula)
const total = filas.find((f) => f.id === 'total')
const tc = filas.find((f) => f.id === 'tc')
if (total === undefined || tc === undefined) throw new Error('faltan filas')

const montar = (extra: Partial<Parameters<typeof BarraDeFormula>[0]> = {}) => {
  const p = {
    fila: total,
    numero: 7,
    abierta: null as FilaAbierta | null,
    motivo: null as string | null,
    aviso: null,
    enfocar: 0,
    deDondeSale: 'Remate + Fees',
    soltados: [],
    alAbrir: vi.fn(),
    alAplicar: vi.fn(),
    alCancelar: vi.fn(),
    alSumarDebajo: vi.fn(),
    ...extra,
  }
  return { ...render(<BarraDeFormula {...p} />), p }
}

const texto = () => screen.getByRole('textbox', { name: 'Texto de Total' }) as HTMLTextAreaElement

describe('La barra de fórmula', () => {
  it('sin fila elegida, lo dice', () => {
    montar({ fila: null, numero: null })
    expect(screen.getByText('Elige una fila para ver su fórmula.')).toBeTruthy()
  })

  it('muestra el texto vigente; el primer cambio abre la fila en el editor', () => {
    const { p } = montar()
    expect(texto().value).toBe('=remate+fees')
    expect(screen.queryByRole('button', { name: 'Aplicar' })).toBeNull()
    fireEvent.change(texto(), { target: { value: '=remate' } })
    expect(p.alAbrir).toHaveBeenCalledWith('total')
  })

  it('con texto sin aplicar, Ctrl+Enter aplica lo tipeado y Esc descarta', () => {
    const { p, rerender } = montar()
    fireEvent.change(texto(), { target: { value: '=remate*2' } })
    rerender(<BarraDeFormula {...p} abierta={{ id: 'total', error: null }} />)
    expect(texto().value).toBe('=remate*2')
    fireEvent.keyDown(texto(), { key: 'Enter', ctrlKey: true })
    expect(p.alAplicar).toHaveBeenCalledWith('=remate*2', false)
    fireEvent.keyDown(texto(), { key: 'Escape' })
    expect(p.alCancelar).toHaveBeenCalledTimes(1)
  })

  it('«Pisar el valor» con pisa_un_valor confirma el pisado', () => {
    const { p } = montar({
      abierta: {
        id: 'total',
        error: {
          codigo: 'pisa_un_valor',
          mensaje: 'Pisaría un valor del ⚙.',
          cambios: [],
        } as never,
      },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Pisar el valor' }))
    expect(p.alAplicar).toHaveBeenCalledWith('=remate+fees', true)
  })

  it('con otra cosa abierta no se escribe y dice por qué', () => {
    const { p } = montar({ motivo: 'Aplica o cancela el grupo abierto.' })
    expect(texto().readOnly).toBe(true)
    fireEvent.change(texto(), { target: { value: 'x' } })
    expect(p.alAbrir).not.toHaveBeenCalled()
    expect(screen.getByText('Aplica o cancela el grupo abierto.')).toBeTruthy()
  })

  it('una fila que no se escribe dice de dónde sale', () => {
    montar({ fila: tc, deDondeSale: 'tipo de cambio Tipo de cambio de hoy' })
    expect(
      screen.getByText('Esta fila no se escribe: tipo de cambio Tipo de cambio de hoy.'),
    ).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})
