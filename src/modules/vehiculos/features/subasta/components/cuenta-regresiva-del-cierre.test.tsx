import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CuentaRegresivaDelCierre } from './cuenta-regresiva-del-cierre'

const AHORA = '2026-11-20T12:00:00.000Z'
const CIERRE = '2026-11-22T16:12:33.000Z'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(AHORA))
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    matches: false,
    media: consulta,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('<CuentaRegresivaDelCierre>', () => {
  it('cuenta cada segundo y cambia de tono al bajar de 24 h', () => {
    const cierre = '2026-11-20T12:00:03.000Z'
    render(<CuentaRegresivaDelCierre cierre={cierre} ahora={AHORA} />)
    expect(screen.getByText('Cierra en 00:00:03')).toBeTruthy()
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('Cierra en 00:00:02').getAttribute('data-cuenta-regresiva')).toBe(
      'urgente',
    )
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByText('Cerrando…')).toBeTruthy()
  })

  it('con días dice «2 d 04:12:33», normal', () => {
    render(<CuentaRegresivaDelCierre cierre={CIERRE} ahora={AHORA} />)
    const cuenta = screen.getByText('Cierra en 2 d 04:12:33')
    expect(cuenta.getAttribute('data-cuenta-regresiva')).toBe('normal')
  })

  it('cien cuentas, un solo temporizador; sin cuentas, ninguno', () => {
    const espia = vi.spyOn(globalThis, 'setInterval')
    const { unmount } = render(
      <>
        {Array.from({ length: 100 }, (_, i) => (
          <CuentaRegresivaDelCierre key={i} cierre={CIERRE} ahora={AHORA} />
        ))}
      </>,
    )
    expect(espia).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('sin fecha: «Sin fecha de cierre»', () => {
    render(<CuentaRegresivaDelCierre cierre={null} ahora={AHORA} />)
    expect(screen.getByText('Sin fecha de cierre')).toBeTruthy()
  })

  it('con menos movimiento, cada minuto y sin segundos', () => {
    vi.stubGlobal('matchMedia', (consulta: string) => ({
      matches: true,
      media: consulta,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }))
    render(<CuentaRegresivaDelCierre cierre={CIERRE} ahora={AHORA} />)
    expect(screen.getByText('Cierra en 2 d 4 h 13 min')).toBeTruthy()
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(screen.getByText('Cierra en 2 d 4 h 12 min')).toBeTruthy()
  })
})
