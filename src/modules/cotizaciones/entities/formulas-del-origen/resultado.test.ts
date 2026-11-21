import { describe, expect, it } from 'vitest'
import {
  CAUSA_SIN_TIPOS_DE_CAMBIO,
  CAUSA_USADA,
  MENSAJE_DEL_TOPE,
  MENSAJE_USADA,
  resultadoDeActivar,
  resultadoDeCambio,
  resultadoDeCrear,
  resultadoDeEliminar,
} from './resultado'

const ID = '11111111-1111-4111-8111-111111111111'
const HORA = '2026-11-20 10:00:00.123456+00'
const error = (code: string, message: string, hint: string | null = null) => ({
  data: null,
  error: { code, message, hint },
})

describe('resultadoDeCrear', () => {
  it('devuelve el id, la hora tal cual y los avisos', () => {
    expect(
      resultadoDeCrear({
        data: { id: ID, actualizado_en: HORA, avisos: [{ tipo: 'tabla_creada', clave: 'flete' }] },
        error: null,
      }),
    ).toEqual({
      ok: true,
      data: { id: ID, actualizadoEn: HORA, avisos: [{ tipo: 'tabla_creada', clave: 'flete' }] },
    })
  })

  it('una respuesta sin la forma no entra', () => {
    expect(resultadoDeCrear({ data: { id: 'x' }, error: null }).ok).toBe(false)
  })

  it('el nombre repetido va junto al nombre; un campo del 22023, junto a su campo', () => {
    expect(
      resultadoDeCrear(error('23505', 'Ya hay una fórmula «A» en este origen.', 'nombre')),
    ).toEqual({
      ok: false,
      error: { codigo: 'duplicado', mensaje: 'Ya hay una fórmula «A» en este origen.' },
      porCampo: { nombre: 'Ya hay una fórmula «A» en este origen.' },
    })
    expect(
      resultadoDeCrear(error('22023', 'Esa fórmula no tiene borrador.', 'pieza')),
    ).toMatchObject({
      porCampo: { pieza: 'Esa fórmula no tiene borrador.' },
    })
  })

  it('el tope dice cómo seguir y los tipos de cambio viajan como causa', () => {
    expect(
      resultadoDeCrear(error('22023', 'Este origen ya tiene 50 fórmulas.', 'formulas')),
    ).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje: MENSAJE_DEL_TOPE, causa: 'formulas' },
    })
    expect(
      resultadoDeCrear(error('22023', 'Crea un tipo de cambio.', CAUSA_SIN_TIPOS_DE_CAMBIO)),
    ).toMatchObject({ error: { causa: CAUSA_SIN_TIPOS_DE_CAMBIO } })
  })

  it('sin permiso y lo desconocido', () => {
    expect(resultadoDeCrear(error('42501', 'No tienes el permiso.'))).toMatchObject({
      error: { codigo: 'sin_permiso' },
    })
    expect(resultadoDeCrear(error('XX000', 'boom'))).toMatchObject({
      error: { codigo: 'inesperado' },
    })
  })
})

describe('resultadoDeCambio, resultadoDeEliminar y resultadoDeActivar', () => {
  it('el PT409 llega tal cual', () => {
    expect(resultadoDeCambio(error('PT409', 'Ana cambió esta fórmula hace 1 min.'))).toEqual({
      ok: false,
      error: { codigo: 'conflicto', mensaje: 'Ana cambió esta fórmula hace 1 min.' },
    })
  })

  it('renombrar devuelve la hora nueva tal cual', () => {
    expect(resultadoDeCambio({ data: HORA, error: null })).toEqual({
      ok: true,
      data: { actualizadoEn: HORA },
    })
  })

  it('eliminar una usada se archiva', () => {
    expect(
      resultadoDeEliminar(error('23503', 'Esta fórmula ya se usó.', 'formula_del_origen'), ID),
    ).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje: MENSAJE_USADA, causa: CAUSA_USADA },
    })
    expect(resultadoDeEliminar({ data: null, error: null }, ID)).toEqual({
      ok: true,
      data: { id: ID },
    })
  })

  it('activar: lo publicado y el rechazo con su lugar como causa', () => {
    expect(
      resultadoDeActivar({
        data: { activa: ID, formula: ID, plantilla: ID, actualizado_en: HORA },
        error: null,
      }),
    ).toEqual({ ok: true, data: { activa: ID, formula: ID, plantilla: ID, actualizadoEn: HORA } })
    expect(
      resultadoDeActivar(error('22023', 'La celda no existe.', 'celdas.c1.contenido')),
    ).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje: 'La celda no existe.', causa: 'celdas.c1.contenido' },
    })
    expect(resultadoDeActivar(error('22023', 'Activar pide una nota.', 'nota'))).toMatchObject({
      porCampo: { nota: 'Activar pide una nota.' },
    })
  })
})
