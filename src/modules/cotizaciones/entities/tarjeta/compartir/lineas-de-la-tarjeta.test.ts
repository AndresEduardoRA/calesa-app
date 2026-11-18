import { describe, expect, it } from 'vitest'
import { formatearMonto } from '@/shared/lib/formato'
import { geometriaDeLaTarjeta } from '../geometria-de-la-tarjeta'
import { tarjetaDesde, type LecturaDeLaTarjeta } from '../lectura-de-la-tarjeta'
import { calculoDePrueba, CONTEXTO_DE_PRUEBA, crudaDeLaTarjeta } from '../tarjeta.soporte'
import { lineasDeLaTarjeta } from './lineas-de-la-tarjeta'

const usd = (v: number) => formatearMonto(v, { moneda: 'USD', locale: 'es-BO' })
const bob = (v: number) => formatearMonto(v, { moneda: 'BOB', locale: 'es-BO' })

function lineas(l: LecturaDeLaTarjeta, calculo = calculoDePrueba({ verTotalBs: true })) {
  return lineasDeLaTarjeta(
    geometriaDeLaTarjeta({
      lectura: l,
      calculo,
      contexto: CONTEXTO_DE_PRUEBA,
      monedaBs: 'BOB',
      locale: 'es-BO',
    }),
  )
}

describe('lineasDeLaTarjeta', () => {
  it('cada monto con su concepto, sin la cabecera, y el total aparte con su segunda línea', () => {
    const l = tarjetaDesde(crudaDeLaTarjeta())
    if (l === null) throw new Error('no se lee')
    expect(lineas(l)).toEqual({
      conceptos: [
        { concepto: 'Remate', monto: usd(1000), segunda: null },
        { concepto: 'Flete marítimo', monto: usd(300), segunda: null },
        { concepto: 'GARANTÍA PARA LA PARTICIPACIÓN', monto: usd(50), segunda: null },
      ],
      total: { concepto: 'TOTAL DÓLARES', monto: usd(1355), segunda: bob(9430.8) },
    })
  })

  it('una fila que no aplica no sale: lo que la tarjeta no dibuja no viaja', () => {
    const l = tarjetaDesde(crudaDeLaTarjeta())
    if (l === null) throw new Error('no se lee')
    const texto = JSON.stringify(lineas(l))
    // `fees` vale 0 y su fila se oculta con `no_aplica_o_cero`.
    expect(texto).not.toContain('Fees')
  })

  it('sin plantilla: sólo el total de la de por omisión', () => {
    expect(lineas({ estado: 'sin_plantilla' }, calculoDePrueba())).toEqual({
      conceptos: [],
      total: { concepto: 'Total', monto: usd(1355), segunda: null },
    })
  })
})
