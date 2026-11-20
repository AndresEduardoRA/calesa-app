import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AjustesEmpresa } from '../../../entities/ajustes-empresa'
import { MOTIVO_MONEDA_BASE_CON_DATOS } from '../../../entities/motivos'
import type { Moneda } from '../../../entities/tipos-cambio'
import { ModalDeMonedaBase } from './modal-de-moneda-base'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('../actions/guardar-ajustes', () => ({ guardarAjustes: vi.fn() }))

const ajustes = {
  monedaBase: 'USD',
  actualizadoEn: '2026-10-12T14:00:00+00:00',
} as AjustesEmpresa

const moneda = (codigo: string, nombre: string): Moneda => ({
  codigo,
  nombre,
  simbolo: codigo,
  decimales: 2,
  activa: true,
  actualizadoEn: '2026-10-12T14:00:00+00:00',
})
const monedas = [moneda('USD', 'Dólar'), moneda('BOB', 'Boliviano')]

afterEach(cleanup)

// Con datos cargados la base ya no se cambia: el campo se ve, apagado, y dice por qué. Sin datos se elige entre las monedas.
describe('ModalDeMonedaBase', () => {
  function montar(conDatosCargados: boolean) {
    render(
      <ModalDeMonedaBase
        abierto
        alCerrar={vi.fn()}
        ajustes={ajustes}
        monedas={monedas}
        conDatosCargados={conDatosCargados}
      />,
    )
  }

  it('con datos cargados, apagada y con su motivo', () => {
    montar(true)
    const campo = screen.getByRole('combobox', { name: 'Moneda base' }) as HTMLSelectElement
    expect(campo.disabled).toBe(true)
    expect(campo.value).toBe('USD')
    expect(screen.getByText(MOTIVO_MONEDA_BASE_CON_DATOS)).toBeTruthy()
  })

  it('sin datos, se elige entre las monedas', () => {
    montar(false)
    const campo = screen.getByRole('combobox', { name: 'Moneda base' }) as HTMLSelectElement
    expect(campo.disabled).toBe(false)
    expect(Array.from(campo.options).map((o) => o.value)).toEqual(['USD', 'BOB'])
  })
})
