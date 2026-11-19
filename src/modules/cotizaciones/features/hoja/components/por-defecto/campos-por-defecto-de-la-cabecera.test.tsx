import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PorDefecto } from '../../../../entities/cabecera-por-defecto'
import { CamposPorDefectoDeLaCabecera } from './campos-por-defecto-de-la-cabecera'

const MODOS = [
  { clave: 'paralelo', nombre: 'Paralelo' },
  { clave: 'unificado', nombre: 'Unificado' },
  { clave: 'oficial', nombre: 'Oficial' },
]
const VALOR: PorDefecto = {
  modo: 'paralelo',
  verTotalBs: false,
  visibles: ['paralelo', 'unificado'],
}

function montar(cambios: Partial<Parameters<typeof CamposPorDefectoDeLaCabecera>[0]> = {}) {
  const alCambiar = vi.fn()
  render(
    <CamposPorDefectoDeLaCabecera
      modos={MODOS}
      valor={VALOR}
      alCambiar={alCambiar}
      ofreceVerTotalBs
      moneda="BOB"
      {...cambios}
    />,
  )
  return alCambiar
}

afterEach(cleanup)

describe('CamposPorDefectoDeLaCabecera', () => {
  it('elegir otro modo por defecto lo deja visible', () => {
    const alCambiar = montar()
    const grupo = screen.getByRole('group', { name: 'Tipo de cambio por defecto' })
    expect(grupo).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: 'Oficial' }))
    expect(alCambiar).toHaveBeenCalledWith({
      modo: 'oficial',
      verTotalBs: false,
      visibles: ['paralelo', 'unificado', 'oficial'],
    })
  })

  it('«Ver total» por defecto nombra la moneda de la hoja o «moneda local»; sin ofrecerlo, no está', () => {
    montar()
    expect(
      screen.getByRole('checkbox', { name: 'Mostrar el total en BOB por defecto' }),
    ).toBeTruthy()
    cleanup()
    montar({ moneda: null })
    expect(
      screen.getByRole('checkbox', { name: 'Mostrar el total en moneda local por defecto' }),
    ).toBeTruthy()
    cleanup()
    montar({ ofreceVerTotalBs: false })
    expect(screen.queryByRole('checkbox', { name: /Mostrar el total/ })).toBeNull()
  })

  it('el modo por defecto queda visible: su casilla marcada y apagada con el motivo; otra se alterna', () => {
    const alCambiar = montar()
    screen.getByRole('group', { name: 'Opciones visibles en el encabezado' })
    const porDefecto = screen.getByRole('checkbox', { name: 'Paralelo' })
    expect(porDefecto.getAttribute('aria-checked')).toBe('true')
    expect(
      porDefecto.getAttribute('aria-disabled') === 'true' ||
        porDefecto.hasAttribute('data-disabled'),
    ).toBe(true)
    expect(
      document.getElementById(porDefecto.getAttribute('aria-describedby') ?? '')?.textContent,
    ).toBe('El modo por defecto debe quedar visible.')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Unificado' }))
    expect(alCambiar).toHaveBeenCalledWith({ ...VALOR, visibles: ['paralelo'] })
  })

  it('con un solo modo no ofrece «Opciones visibles»', () => {
    montar({
      modos: [MODOS[0] ?? { clave: 'x', nombre: 'X' }],
      valor: { ...VALOR, visibles: ['paralelo'] },
    })
    expect(screen.queryByRole('group', { name: 'Opciones visibles en el encabezado' })).toBeNull()
  })
})
