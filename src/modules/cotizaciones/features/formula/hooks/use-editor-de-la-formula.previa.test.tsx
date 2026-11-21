import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FormulaParaEditar } from '../../../entities/formula/edicion'
import { formulaDePrueba } from '../../../entities/formula/fila-de-prueba.soporte'
import { calcularLaVistaPrevia } from '../../../entities/formula/vista-previa'
import type * as ModuloDeLaVistaPrevia from '../../../entities/formula/vista-previa'
import { aplicarEnLaFila } from './aplicar-en-la-fila.soporte'
import { useEditorDeLaFormula } from './use-editor-de-la-formula'

// «Guardar el borrador» (4.21-3b-1): la action no llega aquí (su composición es del servidor).
vi.mock('../actions/guardar-borrador', () => ({
  guardarBorrador: () => Promise.resolve(undefined),
}))

// `calcularLaVistaPrevia()` envuelta, llamando a la real: para contar cuándo se llama.
vi.mock('../../../entities/formula/vista-previa', async (original) => {
  const real = await original<typeof ModuloDeLaVistaPrevia>()
  return { ...real, calcularLaVistaPrevia: vi.fn(real.calcularLaVistaPrevia) }
})
vi.mock('@/shared/ui/toasts', () => ({ avisar: vi.fn() }))
vi.mock('../../../areas/formula/composicion.client', () => ({
  leerElTerrenoDePrueba: () =>
    Promise.resolve({
      ok: true as const,
      data: { tipos_cambio: { oficial: 2 }, monedas: { oficial: 'BOB' }, tablas: {}, avisos: [] },
    }),
}))

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const leida = (): FormulaParaEditar => ({
  id: '22222222-2222-4222-8222-222222222222',
  formulaDelOrigenId: '44444444-4444-4444-8444-444444444444',
  actualizadoEn: '2026-11-07T15:00:00.123456+00:00',
  estado: 'borrador',
  diseno: null,
  nota: null,
  formula: formulaDePrueba([
    { id: 'base', texto: '900', etiqueta: 'Base' },
    { id: 'total', texto: '=base*2', etiqueta: 'Total' },
  ]),
})
const montar = () => renderHook(() => useEditorDeLaFormula({ origenId: ORIGEN, leida: leida() }))
const calculada = (r: ReturnType<typeof montar>['result']) =>
  r.current.vista?.tipo === 'calculada' ? r.current.vista : null

beforeEach(() => {
  window.sessionStorage.clear()
  vi.mocked(calcularLaVistaPrevia).mockClear()
})

describe('useEditorDeLaFormula: la vista previa (T6)', () => {
  it('no hay vista hasta que lo de prueba está leído; después se calcula con la fórmula', async () => {
    const { result } = montar()
    expect(result.current.vista).toBeNull()
    expect(result.current.lectura.tipo).toBe('leyendo')
    await waitFor(() => {
      expect(result.current.lectura.tipo).toBe('lista')
    })
    expect(calculada(result)?.valores.get('total')).toBe(1800)
  })

  it('no vuelve a calcular al abrir ni al cerrar una fila; sí con un cambio que entra', async () => {
    const { result } = montar()
    await waitFor(() => {
      expect(result.current.vista).not.toBeNull()
    })
    const antes = vi.mocked(calcularLaVistaPrevia).mock.calls.length
    act(() => {
      result.current.abrir('total')
    })
    act(() => {
      result.current.cerrar()
    })
    expect(vi.mocked(calcularLaVistaPrevia).mock.calls.length).toBe(antes)
    aplicarEnLaFila(result, 'total', '=base*3')
    expect(vi.mocked(calcularLaVistaPrevia).mock.calls.length).toBe(antes + 1)
    expect(calculada(result)?.valores.get('total')).toBe(2700)
  })

  it('un cambio que deja la fórmula inválida da no_valida y el rechazo en su fila', async () => {
    const { result } = montar()
    await waitFor(() => {
      expect(result.current.vista).not.toBeNull()
    })
    aplicarEnLaFila(result, 'total', 'SI(b; base)')
    expect(result.current.vista).toEqual({ tipo: 'no_valida' })
    expect(result.current.rechazo?.filaId).toBe('total')
  })
})
