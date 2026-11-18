import { describe, expect, it } from 'vitest'
import {
  contextoDeLaPagina,
  inicialesDe,
  valorDeLaVariable,
  type ContextoDeLaCotizacion,
} from './contexto-de-la-cotizacion'

const CONTEXTO: ContextoDeLaCotizacion = {
  fecha: '6 nov 2026',
  numero: '12',
  titulo: 'Toyota para Ana',
  asesor: 'ana maría lópez',
  cliente: 'Juan Pérez',
  vehiculo: { titulo: 'Toyota Hilux 2022', lote: '4455', vin: null },
  venceEl: null,
  logo: null,
}

describe('las variables de la tarjeta', () => {
  it('las iniciales de las dos primeras palabras, en mayúsculas', () => {
    expect(inicialesDe('ana maría lópez')).toBe('AM')
    expect(inicialesDe('  Óscar ')).toBe('Ó')
    expect(inicialesDe(null)).toBe('')
  })

  it('cada variable con su valor; sin valor (o una que no existe), vacía', () => {
    const delCalculo = { tituloOpcion: 'COTIZACIÓN MOTO', modo: 'Paralelo' }
    const valor = (v: string) => valorDeLaVariable(v, CONTEXTO, delCalculo)
    expect(valor('numero')).toBe('12')
    expect(valor('asesor_iniciales')).toBe('AM')
    expect(valor('vehiculo_lote')).toBe('4455')
    expect(valor('vehiculo_vin')).toBe('')
    expect(valor('vence_el')).toBe('')
    expect(valor('titulo_opcion')).toBe('COTIZACIÓN MOTO')
    expect(valor('modo_tc')).toBe('Paralelo')
    expect(valor('constructor')).toBe('')
  })
})

describe('contextoDeLaPagina', () => {
  it('la fecha del último guardado (o la de hoy) y el día del vencimiento en la zona de la empresa, y el número pelado', () => {
    const pagina = {
      titulo: null,
      cliente: null,
      vehiculo: null,
      asesor: 'Ana',
      numero: 12,
      venceEl: '2026-12-04',
      guardadaEl: '2026-11-07T02:00:00.123456+00:00',
      logo: null,
    }
    const c = contextoDeLaPagina(pagina, { zona: 'America/La_Paz', hoy: '2026-11-18T12:00:00Z' })
    expect(c).toMatchObject({ fecha: '6 nov 2026', numero: '12', venceEl: '4 dic 2026' })
    expect(
      contextoDeLaPagina(
        { ...pagina, guardadaEl: null, numero: null, venceEl: null },
        { zona: 'America/La_Paz', hoy: '2026-11-18T12:00:00Z' },
      ),
    ).toMatchObject({
      fecha: '18 nov 2026',
      numero: null,
      venceEl: null,
    })
  })
})
