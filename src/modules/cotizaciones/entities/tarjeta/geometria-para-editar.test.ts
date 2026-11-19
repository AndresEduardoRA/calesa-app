import { describe, expect, it } from 'vitest'
import { geometriaDeLaTarjeta } from './geometria-de-la-tarjeta'
import { paraEditar } from './geometria-para-editar'
import { tarjetaDesde } from './lectura-de-la-tarjeta'
import { calculoDePrueba, CONTEXTO_DE_PRUEBA, crudaDeLaTarjeta } from './tarjeta.soporte'

const geometria = () => {
  const lectura = tarjetaDesde(crudaDeLaTarjeta())
  if (lectura === null) throw new Error('la tarjeta de prueba no se lee')
  return geometriaDeLaTarjeta({
    lectura,
    calculo: calculoDePrueba(),
    contexto: CONTEXTO_DE_PRUEBA,
    monedaBs: 'BOB',
    locale: 'es-BO',
  })
}

describe('paraEditar', () => {
  it('lleva el tamaño, las bandas de las filas que se dibujan y las ocultas con su motivo, sin las celdas', () => {
    const g = geometria()
    const p = paraEditar(g)
    expect(p).toEqual({
      ancho: g.ancho,
      alto: g.alto,
      filas: g.filas,
      ocultas: [
        {
          fila: 'n_fees',
          etiqueta: 'Fees',
          delNodo: 'Fees',
          motivo: 'no_aplica',
          variante: 'COTIZACIÓN A GASOLINA',
        },
      ],
    })
    expect('celdas' in p).toBe(false)
    // La última banda termina donde termina la tarjeta: la capa se alinea con lo dibujado.
    const ultima = p.filas[p.filas.length - 1]
    expect(ultima === undefined ? 0 : ultima.y + ultima.alto).toBe(p.alto)
  })
})
