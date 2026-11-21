import { describe, expect, it } from 'vitest'
import type { CalculoDeLaTarjeta } from '../calculo-de-la-tarjeta'
import type { ContextoDeLaCotizacion } from '../contexto-de-la-cotizacion'
import { geometriaDeLaTarjeta, type CeldaDibujada, type Geometria } from './geometria-de-la-tarjeta'
import { tarjetaDesde } from './lectura-de-la-tarjeta'
import {
  calculoDePrueba,
  CONTEXTO_DE_PRUEBA,
  crudaDeLaTarjeta,
  DEFINICION_DE_PRUEBA,
} from './tarjeta.soporte'
import { textoDeLaTarjeta } from './texto-de-la-tarjeta'

// La tarjeta de prueba con una fila arriba que lleva el título con su respaldo y un monto según condiciones, y una fila que se oculta por las suyas.
const DEFINICION = {
  ...DEFINICION_DE_PRUEBA,
  filas: [
    { id: 'cabeza', alto: 30, ocultar_si: 'nunca' },
    {
      id: 'aviso',
      alto: 20,
      ocultar_si: 'condiciones',
      si: [{ es: 'opcion', nodo: 'variante', opcion: 'gasolina' }],
    },
    ...DEFINICION_DE_PRUEBA.filas,
  ],
  celdas: [
    {
      id: 'c_cabeza',
      fila: 'cabeza',
      columna: 'grupo',
      abarca_columnas: 2,
      contenido: {
        tipo: 'respaldo',
        datos: [
          { tipo: 'dato', variable: 'titulo' },
          { tipo: 'dato', variable: 'vehiculo_titulo' },
        ],
      },
    },
    {
      id: 'c_segun',
      fila: 'cabeza',
      columna: 'monto',
      abarca_columnas: 2,
      contenido: {
        tipo: 'condiciones',
        ramas: [
          {
            si: [{ es: 'mayor', nodo: 'total', a: 1000 }],
            contenido: { tipo: 'dato', nodo: 'total', mostrar: 'monto' },
          },
        ],
        si_no: { tipo: 'texto', texto: 'A consultar' },
      },
    },
    {
      id: 'c_aviso',
      fila: 'aviso',
      columna: 'grupo',
      abarca_columnas: 4,
      contenido: { tipo: 'texto', texto: 'Sólo diésel' },
    },
    ...DEFINICION_DE_PRUEBA.celdas,
  ],
}

const lectura = () => {
  const l = tarjetaDesde(crudaDeLaTarjeta({ definicion: DEFINICION }))
  if (l === null) throw new Error('la tarjeta de prueba no se lee')
  return l
}

const geometria = (
  calculo: CalculoDeLaTarjeta = calculoDePrueba(),
  titulo: string | null = null,
  vehiculo: ContextoDeLaCotizacion['vehiculo'] = CONTEXTO_DE_PRUEBA.vehiculo,
) =>
  geometriaDeLaTarjeta({
    lectura: lectura(),
    calculo,
    contexto: { ...CONTEXTO_DE_PRUEBA, titulo, vehiculo },
    monedaBs: 'BOB',
    locale: 'es-BO',
  })

const celda = (g: Geometria, id: string): CeldaDibujada => {
  const c = g.celdas.find((x) => x.id === id)
  if (c === undefined) throw new Error(`sin la celda ${id}`)
  return c
}
const textoDe = (c: CeldaDibujada) =>
  c.contenido.tipo === 'texto' ? c.contenido.lineas.join('\n') : c.contenido.tipo

const conVariante = (mas: Partial<CalculoDeLaTarjeta> = {}) => {
  const base = calculoDePrueba()
  return calculoDePrueba({
    estados: new Map([...(base.estados ?? []), ['variante', 'activo']]),
    ...mas,
  })
}

describe('geometriaDeLaTarjeta con la lista de respaldo y las condiciones', () => {
  it('la celda del título muestra el de la cotización o, sin él (o en blanco), el del vehículo, con la marca del que ganó; sin ninguno queda vacía', () => {
    const conTitulo = celda(geometria(conVariante(), 'Para Juan'), 'c_cabeza')
    expect(textoDe(conTitulo)).toBe('Para Juan')
    expect(conTitulo.marca).toEqual({ variable: 'titulo' })
    const sinTitulo = celda(geometria(conVariante(), '  '), 'c_cabeza')
    expect(textoDe(sinTitulo)).toBe('Toyota Hilux 2022')
    expect(sinTitulo.marca).toEqual({ variable: 'vehiculo_titulo' })
    const nada = celda(geometria(conVariante(), null, null), 'c_cabeza')
    expect(nada.contenido).toEqual({ tipo: 'vacio' })
    expect(nada.marca).toEqual({})
  })

  it('el monto de una rama se dibuja como monto y lleva la marca del total; si no se cumple, el «si no»', () => {
    const g = geometria(conVariante())
    const segun = celda(g, 'c_segun')
    expect(segun.contenido).toMatchObject({ tipo: 'monto', valor: 1355, moneda: 'USD' })
    expect(segun.marca).toEqual({ nodo: 'total', mostrar: 'monto', total: true })
    const barato = conVariante({ totales: { usd: 900, bs: null } })
    expect(textoDe(celda(geometria(barato), 'c_segun'))).toBe('A consultar')
    // «Copiar texto» sale de la misma geometría.
    const monto = segun.contenido.tipo === 'monto' ? segun.contenido.texto : ''
    expect(textoDeLaTarjeta(g, lectura()).split('\n')[0]).toBe(`Toyota Hilux 2022: ${monto}`)
  })

  it('una fila se oculta cuando se cumplen sus condiciones, con el motivo «condicion» y su rótulo en lugar del nodo', () => {
    const g = geometria(conVariante())
    expect(g.celdas.some((c) => c.id === 'c_aviso')).toBe(false)
    expect(g.ocultas).toContainEqual({
      fila: 'aviso',
      etiqueta: 'Sólo diésel',
      delNodo: 'Sólo diésel',
      motivo: 'condicion',
      variante: null,
    })
    const diesel = conVariante({
      valores: new Map([...calculoDePrueba().valores, ['variante', 'diesel']]),
    })
    expect(textoDe(celda(geometria(diesel), 'c_aviso'))).toBe('Sólo diésel')
  })

  it('una condición que no tiene respuesta (su nodo no está en la versión) no oculta la fila', () => {
    // Sin la variante en los estados, la condición no tiene respuesta.
    const g = geometria(calculoDePrueba())
    expect(textoDe(celda(g, 'c_aviso'))).toBe('Sólo diésel')
    expect(g.ocultas.some((o) => o.fila === 'aviso')).toBe(false)
  })
})
