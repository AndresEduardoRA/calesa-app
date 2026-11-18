import { describe, expect, it } from 'vitest'
import { formatearMonto } from '@/shared/lib/formato'
import { geometriaDeLaTarjeta } from './geometria-de-la-tarjeta'
import { tarjetaDesde, type LecturaDeLaTarjeta } from './lectura-de-la-tarjeta'
import { textoDeLaTarjeta } from './texto-de-la-tarjeta'
import { calculoDePrueba, CONTEXTO_DE_PRUEBA, crudaDeLaTarjeta } from './tarjeta.soporte'

const usd = (v: number) => formatearMonto(v, { moneda: 'USD', locale: 'es-BO' })
const bob = (v: number) => formatearMonto(v, { moneda: 'BOB', locale: 'es-BO' })

function texto(l: LecturaDeLaTarjeta, calculo = calculoDePrueba({ verTotalBs: true })) {
  const g = geometriaDeLaTarjeta({
    lectura: l,
    calculo,
    contexto: CONTEXTO_DE_PRUEBA,
    monedaBs: 'BOB',
    locale: 'es-BO',
  })
  return textoDeLaTarjeta(g, l)
}

describe('textoDeLaTarjeta', () => {
  it('sale de la geometría: el encabezado, cada grupo en su bloque con «concepto: monto», el total con su segunda línea, lo aparte y la nota', () => {
    const l = tarjetaDesde(crudaDeLaTarjeta())
    if (l === null) throw new Error('no se lee')
    expect(texto(l)).toBe(
      [
        'COTIZACIÓN A GASOLINA · 6 nov 2026\nAsesor: Ana Pérez',
        `Compra\nRemate: ${usd(1000)}\nDólar oficial`,
        `Logística\nFlete marítimo: ${usd(300)}\n—`,
        `TOTAL DÓLARES: ${usd(1355)}\n${bob(9430.8)}\nGARANTÍA PARA LA PARTICIPACIÓN: ${usd(50)}`,
        'Precios sujetos a cambio. No incluye reparación.',
      ].join('\n\n'),
    )
  })

  it('por omisión: la fecha, el número, el asesor, el vehículo y el total', () => {
    expect(texto({ estado: 'sin_plantilla' }, calculoDePrueba())).toBe(
      [
        '6 nov 2026\nCotización n.º 12\nAsesor: Ana Pérez\nToyota Hilux 2022',
        `Total: ${usd(1355)}`,
      ].join('\n\n'),
    )
  })
})
