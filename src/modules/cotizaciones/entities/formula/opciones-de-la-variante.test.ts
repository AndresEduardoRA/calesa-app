import { describe, expect, it } from 'vitest'
import {
  OPCION_NUEVA,
  opcionesParaGuardar,
  pedidoDeLaVariante,
  varianteInicial,
} from './opciones-de-la-variante'

describe('las opciones de una variante en el panel', () => {
  it('una opción que ya estaba conserva su clave; una nueva la saca de la etiqueta sin chocar', () => {
    const opciones = opcionesParaGuardar([
      { clave: 'maritima', etiqueta: ' Marítima ', titulo: '' },
      { clave: '', etiqueta: 'Marítima', titulo: 'Por barco' },
      { clave: '', etiqueta: '4x4', titulo: '' },
    ])
    expect(opciones).toEqual([
      { clave: 'maritima', etiqueta: 'Marítima', titulo: 'Marítima' },
      { clave: 'maritima_2', etiqueta: 'Marítima', titulo: 'Por barco' },
      { clave: 'opcion_4x4', etiqueta: '4x4', titulo: '4x4' },
    ])
  })

  it('el pedido lleva la opción por defecto por su clave y el par sólo marcado', () => {
    const pedido = pedidoDeLaVariante({
      opciones: [
        { clave: 'a', etiqueta: 'A', titulo: 'A' },
        { clave: '', etiqueta: 'Aérea', titulo: '' },
      ],
      porDefecto: 1,
      enPar: false,
    })
    expect(pedido).toEqual({
      tipo: 'variante',
      opciones: [
        { clave: 'a', etiqueta: 'A', titulo: 'A' },
        { clave: 'aerea', etiqueta: 'Aérea', titulo: 'Aérea' },
      ],
      porDefecto: 'aerea',
    })
    expect(pedidoDeLaVariante({ opciones: [], porDefecto: null, enPar: true })).toEqual({
      tipo: 'variante',
      opciones: [],
      enPar: true,
    })
  })

  it('abre con las opciones de la variante de antes o con dos vacías', () => {
    expect(varianteInicial({ tipo: 'constante' })).toEqual({
      opciones: [OPCION_NUEVA, OPCION_NUEVA],
      porDefecto: null,
      enPar: false,
    })
    const opciones = [
      { clave: 'a', etiqueta: 'A', titulo: 'Opción A' },
      { clave: 'b', etiqueta: 'B', titulo: 'Opción B' },
    ]
    expect(varianteInicial({ tipo: 'opcion', opciones, por_defecto: 'b', en_par: true })).toEqual({
      opciones,
      porDefecto: 1,
      enPar: true,
    })
  })
})
