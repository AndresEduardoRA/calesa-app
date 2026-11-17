import { describe, expect, it } from 'vitest'
import { G } from './pasos.soporte'
import {
  TOPE_DE_FASES_DE_LOS_PASOS,
  TOPE_DE_REQUISITOS_DE_LOS_PASOS,
  TOPE_DE_SALIDAS_DE_LOS_PASOS,
  flujoDeLosPasosDesde,
} from './pasos-del-flujo'

const faseDeBase = (n: number, extra: Record<string, unknown> = {}) => ({
  id: G(n),
  nombre: `Fase ${String(n)}`,
  color: '#717c93',
  orden: n * 10,
  activa: true,
  es_inicial: n === 1,
  es_final: false,
  ...extra,
})

describe('el flujo de los pasos desde la base', () => {
  it('convierte las filas y deja sólo las claves de hito', () => {
    const r = flujoDeLosPasosDesde(
      [faseDeBase(1), faseDeBase(2)],
      [{ de_fase_id: G(1), a_fase_id: G(2), accion: 'Comprar' }],
      [
        { fase_id: G(2), clave_dato: 'repuesto.precio', bloqueante: true },
        { fase_id: G(2), clave_dato: 'proyecto.pago_cliente', bloqueante: false },
        { fase_id: G(2), clave_dato: 'repuesto.tracking', bloqueante: true },
        { fase_id: G(2), clave_dato: 'toString', bloqueante: true },
      ],
    )
    expect(r.estado).toBe('listo')
    if (r.estado !== 'listo') return
    expect(r.flujo.fases[0]).toMatchObject({ id: G(1), esInicial: true, esFinal: false })
    expect(r.flujo.salidas).toEqual([{ de: G(1), a: G(2), accion: 'Comprar' }])
    expect(r.flujo.pedidos).toEqual([
      { faseId: G(2), hito: 'precio', bloqueante: true },
      { faseId: G(2), hito: 'pago', bloqueante: false },
    ])
  })

  it('descarta lo que nombra una fase que no se leyó', () => {
    const r = flujoDeLosPasosDesde(
      [faseDeBase(1)],
      [{ de_fase_id: G(1), a_fase_id: G(9), accion: null }],
      [{ fase_id: G(9), clave_dato: 'repuesto.precio', bloqueante: true }],
    )
    expect(r).toEqual({
      estado: 'listo',
      flujo: expect.objectContaining({ salidas: [], pedidos: [] }),
    })
  })

  it('sin fases activas: `sin_fases`', () => {
    expect(flujoDeLosPasosDesde([], [], [])).toEqual({ estado: 'sin_fases' })
    expect(flujoDeLosPasosDesde([faseDeBase(1, { activa: false })], [], [])).toEqual({
      estado: 'sin_fases',
    })
  })

  it('una fila con otra forma: `ilegible`', () => {
    expect(flujoDeLosPasosDesde([{ id: 'x' }], [], [])).toEqual({ estado: 'ilegible' })
    expect(flujoDeLosPasosDesde([faseDeBase(1)], null, [])).toEqual({ estado: 'ilegible' })
  })

  it('más de lo que se puede mostrar: `tope`', () => {
    const muchas = Array.from({ length: TOPE_DE_FASES_DE_LOS_PASOS + 1 }, (_, i) =>
      faseDeBase(i + 1),
    )
    expect(flujoDeLosPasosDesde(muchas, [], [])).toEqual({ estado: 'tope' })
    const salida = { de_fase_id: G(1), a_fase_id: G(1), accion: null }
    expect(
      flujoDeLosPasosDesde(
        [faseDeBase(1)],
        Array(TOPE_DE_SALIDAS_DE_LOS_PASOS + 1).fill(salida),
        [],
      ),
    ).toEqual({ estado: 'tope' })
    const pedido = { fase_id: G(1), clave_dato: 'repuesto.precio', bloqueante: true }
    expect(
      flujoDeLosPasosDesde(
        [faseDeBase(1)],
        [],
        Array(TOPE_DE_REQUISITOS_DE_LOS_PASOS + 1).fill(pedido),
      ),
    ).toEqual({ estado: 'tope' })
  })
})
