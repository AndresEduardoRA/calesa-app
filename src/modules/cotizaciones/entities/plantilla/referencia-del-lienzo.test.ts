import { describe, expect, it } from 'vitest'
import type { ReferenciaDeLaTarjeta, ReferenciaLeida } from '../referencia-de-la-tarjeta'
import {
  motivoSinCotizacion,
  NO_SE_LEYO_LA_REFERENCIA,
  nombreDeLaReferencia,
  referenciaUsada,
} from './referencia-del-lienzo'

const LEIDA: ReferenciaLeida = {
  estado: 'cotizacion',
  numero: 123,
  valores: [],
  estados: [],
  totales: { usd: null, bs: null },
  modoTc: null,
  verTotalBs: false,
  monedaBs: null,
  contexto: {
    fecha: '19 nov 2026',
    numero: '123',
    titulo: null,
    asesor: null,
    cliente: null,
    vehiculo: null,
    venceEl: null,
    empresa: null,
    logo: null,
  },
}
const SIN: ReferenciaDeLaTarjeta = { estado: 'sin_cotizacion' }
const ILEGIBLE: ReferenciaDeLaTarjeta = { estado: 'no_se_leyo' }

describe('la referencia del lienzo', () => {
  it('se nombra por su número', () => {
    expect(nombreDeLaReferencia(LEIDA)).toBe('Cotización n.º 123')
  })
  it('sin cotización o ilegible, sólo las cifras de ejemplo y dice por qué', () => {
    expect(motivoSinCotizacion(LEIDA, 'Mini')).toBeNull()
    expect(motivoSinCotizacion(SIN, 'Mini')).toBe(
      'Todavía no hay cotizaciones de Mini que veas: se usan cifras de ejemplo.',
    )
    expect(motivoSinCotizacion(ILEGIBLE, 'Mini')).toBe(NO_SE_LEYO_LA_REFERENCIA)
  })
  it('la que dibuja el lienzo: la cotización salvo que se pidan las cifras de ejemplo o no haya', () => {
    expect(referenciaUsada(LEIDA, false)).toBe(LEIDA)
    expect(referenciaUsada(LEIDA, true)).toBeNull()
    expect(referenciaUsada(SIN, false)).toBeNull()
    expect(referenciaUsada(ILEGIBLE, false)).toBeNull()
  })
})
