import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MENSAJE_SIN_CONEXION, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { ESPERA_DE_LA_PALETA_MS } from '../../paleta/hooks/use-busqueda-de-la-paleta'
import type { FilaDeLead } from '../../../entities/resultados'
import {
  useBusquedaDeLeadsDeLaCartera,
  type LecturaDeLeadsDeLaCartera,
} from './use-busqueda-de-leads-de-la-cartera'

// `leads/client` reexporta una Server Action cuya composición importa `server-only`: aquí sólo se usa `interpretarBusqueda`.
vi.mock('server-only', () => ({}))

const lead = (n: number, nombre: string): FilaDeLead => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  nombre,
  numero_visible: n,
})

const pasar = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

function con(texto: string, lectura: LecturaDeLeadsDeLaCartera) {
  return renderHook(() => useBusquedaDeLeadsDeLaCartera({ texto, lectura }))
}

describe('useBusquedaDeLeadsDeLaCartera', () => {
  it('bajo el mínimo no pide nada', async () => {
    const lectura = vi.fn<LecturaDeLeadsDeLaCartera>()
    const hook = con('an', lectura)
    await pasar(ESPERA_DE_LA_PALETA_MS * 2)
    expect(hook.result.current.estado).toEqual({ tipo: 'reposo' })
    expect(lectura).not.toHaveBeenCalled()
  })

  it('un teléfono no se busca', async () => {
    const lectura = vi.fn<LecturaDeLeadsDeLaCartera>()
    const hook = con('+54 911 5555 0000', lectura)
    await pasar(ESPERA_DE_LA_PALETA_MS * 2)
    expect(hook.result.current.estado).toEqual({ tipo: 'telefono' })
    expect(lectura).not.toHaveBeenCalled()
  })

  it('espera, busca y muestra hasta el tope diciendo si hay más', async () => {
    const lectura = vi
      .fn<LecturaDeLeadsDeLaCartera>()
      .mockResolvedValue(ok([1, 2, 3, 4, 5, 6].map((n) => lead(n, `Ana ${String(n)}`))))
    const hook = con('ana', lectura)
    expect(hook.result.current.estado).toEqual({ tipo: 'esperando' })
    await pasar(ESPERA_DE_LA_PALETA_MS)
    const estado = hook.result.current.estado
    expect(estado.tipo).toBe('listo')
    if (estado.tipo === 'listo') {
      expect(estado.filas).toHaveLength(5)
      expect(estado.hayMas).toBe(true)
    }
    expect(lectura).toHaveBeenCalledTimes(1)
    expect(lectura.mock.calls[0]?.[0].texto).toBe('ana')
  })

  it('sin resultados queda vacío, no en error', async () => {
    const hook = con('zzz', vi.fn<LecturaDeLeadsDeLaCartera>().mockResolvedValue(ok([])))
    await pasar(ESPERA_DE_LA_PALETA_MS)
    expect(hook.result.current.estado).toEqual({ tipo: 'listo', filas: [], hayMas: false })
  })

  it('un error se dice y reintentar vuelve a pedir', async () => {
    const lectura = vi
      .fn<LecturaDeLeadsDeLaCartera>()
      .mockResolvedValueOnce(fallo('inesperado', MENSAJE_SIN_CONEXION) as Resultado<FilaDeLead[]>)
      .mockResolvedValueOnce(ok([lead(1, 'Ana')]))
    const hook = con('ana', lectura)
    await pasar(ESPERA_DE_LA_PALETA_MS)
    expect(hook.result.current.estado.tipo).toBe('sin_conexion')
    act(() => {
      hook.result.current.reintentar()
    })
    await pasar(ESPERA_DE_LA_PALETA_MS)
    expect(hook.result.current.estado.tipo).toBe('listo')
    expect(lectura).toHaveBeenCalledTimes(2)
  })

  it('una lectura que lanza no revienta el paso', async () => {
    const hook = con('ana', vi.fn<LecturaDeLeadsDeLaCartera>().mockRejectedValue(new Error('x')))
    await pasar(ESPERA_DE_LA_PALETA_MS)
    expect(hook.result.current.estado.tipo).toBe('error')
  })
})
