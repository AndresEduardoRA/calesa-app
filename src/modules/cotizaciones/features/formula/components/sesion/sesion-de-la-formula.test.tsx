import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import type { FormulaParaEditar } from '../../../../entities/formula/edicion'
import { formulaDePrueba } from '../../../../entities/formula/fila-de-prueba.soporte'
import { SesionDeLaFormula, type PropsDeLaSesion } from './sesion-de-la-formula'

vi.mock('../../actions/guardar-borrador', () => ({
  guardarBorrador: () => Promise.resolve(undefined),
}))
type Respuesta = Resultado<FormulaParaEditar | null>
const pedidos: ((r: Respuesta) => void)[] = []
vi.mock('../../../../areas/formula/composicion.client', () => ({
  leerElTerrenoDePrueba: () =>
    Promise.resolve({
      ok: true as const,
      data: { tipos_cambio: { oficial: 2 }, monedas: { oficial: 'BOB' }, tablas: {}, avisos: [] },
    }),
  leerDefinicionParaEditar: () =>
    new Promise<Respuesta>((resolver) => {
      pedidos.push(resolver)
    }),
  leerTonosDelCatalogo: () => Promise.resolve({ ok: true as const, data: [] }),
}))
vi.mock('@/shared/ui/toasts', () => ({ avisar: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
// Lo diferido llega directo.
vi.mock('./diferidos', async () => ({
  ListaDeFilasDiferida: (await import('../editor/lista-de-filas')).ListaDeFilas,
}))
vi.mock('../planilla/diferidos', async () => ({
  PlanillaDiferida: (await import('../planilla/planilla-de-la-formula')).PlanillaDeLaFormula,
}))

const ORIGEN = { id: '11111111-1111-4111-8111-111111111111', nombre: 'Japón' }
const formula = formulaDePrueba([
  { id: 'comision', texto: '=remate*4%', etiqueta: 'Comisión' },
  { id: 'despacho', texto: '=900', etiqueta: 'Despacho' },
  { id: 'total', texto: '=comision+despacho', etiqueta: 'Total' },
])
const leida: Respuesta = {
  ok: true,
  data: {
    id: '22222222-2222-4222-8222-222222222222',
    actualizadoEn: '2026-11-07T15:00:00.123456+00:00',
    estado: 'borrador',
    diseno: null,
    nota: null,
    formula,
  },
}

const props = (extra: Partial<PropsDeLaSesion> = {}): PropsDeLaSesion => ({
  origen: ORIGEN,
  formulaId: '22222222-2222-4222-8222-222222222222',
  sobre: 'Sobre el borrador de Ana.',
  avanzado: false,
  alAbrirAvanzado: vi.fn(),
  alVolver: vi.fn(),
  recargando: false,
  alRecargar: vi.fn(),
  alCambiarPendientes: vi.fn(),
  tarjeta: { estado: 'sin_tarjeta' },
  tablas: [],
  TarjetaEnVivo: () => null,
  puedeCambiarTiposDeCambio: false,
  ...extra,
})

const responder = async () => {
  await waitFor(() => {
    expect(pedidos.length).toBeGreaterThan(0)
  })
  await act(async () => {
    pedidos[0]?.(leida)
    await Promise.resolve()
  })
}

beforeEach(() => {
  pedidos.length = 0
  window.sessionStorage.clear()
})
afterEach(cleanup)

describe('SesionDeLaFormula', () => {
  it('mientras lee, el esqueleto en la planilla; leída, la planilla con sus cuatro columnas y la frase', async () => {
    render(<SesionDeLaFormula {...props()} />)
    expect(screen.getByRole('region', { name: 'Planilla de la fórmula' })).toBeTruthy()
    expect(screen.getByLabelText('Cargando la lista')).toBeTruthy()
    await responder()
    for (const columna of ['A · concepto', 'B · %', 'C · valor', 'D · de dónde sale']) {
      expect(screen.getByRole('columnheader', { name: columna })).toBeTruthy()
    }
    expect(
      screen.getByText(
        'Las celdas que se editan están marcadas. Todo lo demás se calcula, igual que en la planilla.',
      ),
    ).toBeTruthy()
  })

  it('lo aplicado en la planilla se ve en el Modo avanzado, sin volver a leer, y avisa que hay cambios sin guardar', async () => {
    const alCambiarPendientes = vi.fn()
    const p = props({ alCambiarPendientes })
    const { rerender } = render(<SesionDeLaFormula {...p} />)
    await responder()
    fireEvent.click(screen.getByRole('button', { name: /^Despacho, valor/ }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Despacho, valor' }), {
      target: { value: '950' },
    })
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Despacho, valor' }), { key: 'Enter' })
    await waitFor(() => {
      expect(alCambiarPendientes).toHaveBeenLastCalledWith(true)
    })
    rerender(<SesionDeLaFormula {...p} avanzado />)
    expect(screen.getByRole('list', { name: 'Filas de la fórmula' })).toBeTruthy()
    expect(document.querySelector('li[data-fila="despacho"]')?.textContent).toContain('=950')
    expect(pedidos).toHaveLength(1)
  })
})
