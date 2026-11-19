import { describe, expect, it } from 'vitest'
import { resultadoDeCrearEnPar, resultadoDeGuardarEnPar } from './resultado-en-par'

const una = (id: string, numero: number, usd: number) => ({
  cotizacion: { id, numero },
  totales: { usd },
})
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

describe('el resultado de guardar en par', () => {
  it('la primera opción es la guardada y la segunda su hermana', () => {
    const r = resultadoDeCrearEnPar({
      data: { cotizaciones: [una(A, 7, 100), una(B, 8, 110)], repetido: true },
      error: null,
    })
    expect(r).toEqual({
      tipo: 'guardada',
      cotizacion: {
        id: A,
        numero: 7,
        totalUsd: 100,
        repetido: true,
        hermana: { id: B, numero: 8, totalUsd: 110, repetido: true },
      },
    })
  })

  it('una respuesta que no es un par es perdida; un rechazo con SQLSTATE, un rechazo', () => {
    expect(
      resultadoDeCrearEnPar({ data: { cotizaciones: [una(A, 7, 100)] }, error: null }),
    ).toEqual({ tipo: 'perdida' })
    expect(
      resultadoDeCrearEnPar({
        data: null,
        error: { code: '22023', message: 'x', details: 'cotizar_en_par', hint: 'variante' },
      }),
    ).toEqual({ tipo: 'rechazo', motivo: 'recargar_hoja' })
  })

  it('el PT409 de guardar en par nombra por su opción la que cambió', () => {
    const r = resultadoDeGuardarEnPar(
      {
        data: null,
        error: { code: 'PT409', message: 'Ana cambió esta cotización hace 2 min.', hint: B },
      },
      { ids: [A, B], etiquetas: ['20 pies', '40 pies'], cambiaElVehiculo: false },
    )
    expect(r).toEqual({
      tipo: 'rechazo',
      motivo: 'version_cambiada',
      mensaje: 'Cambió la de 40 pies: Ana cambió esta cotización hace 2 min.',
    })
    expect(
      resultadoDeGuardarEnPar(
        {
          data: null,
          error: { code: '22023', message: 'x', details: 'no_son_hermanas', hint: 'ids' },
        },
        { ids: [A, B], etiquetas: ['20 pies', '40 pies'], cambiaElVehiculo: false },
      ),
    ).toEqual({ tipo: 'rechazo', motivo: 'cotizacion_cambio' })
  })
})
