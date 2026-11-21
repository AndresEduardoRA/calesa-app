import { describe, expect, it } from 'vitest'
import {
  resultadoDeColumnas,
  resultadoDeCrear,
  resultadoDeDesactivar,
} from './resultado-de-estructura'

const TABLA = '22222222-2222-4222-8222-222222222222'

describe('resultadoDeCrear', () => {
  it('entra: id, clave, versión y si era un intento repetido', () => {
    expect(
      resultadoDeCrear({
        data: { id: TABLA, clave: 'fletes', version: 1, repetido: false },
        error: null,
      }),
    ).toEqual({ ok: true, data: { id: TABLA, clave: 'fletes', version: 1, repetido: false } })
  })

  it('la clave tomada va al nombre, con el mensaje tal cual', () => {
    const mensaje = 'Ya hay una tabla con la clave «fletes»: elige otro nombre.'
    expect(
      resultadoDeCrear({ data: null, error: { code: '23505', message: mensaje, hint: 'nombre' } }),
    ).toEqual({ ok: false, error: { codigo: 'duplicado', mensaje }, porCampo: { nombre: mensaje } })
  })

  it('un 22023 con hint de una columna va a ese campo aunque diga «columna»', () => {
    const mensaje = 'La columna 2: el tipo es número, año o texto.'
    expect(
      resultadoDeCrear({
        data: null,
        error: { code: '22023', message: mensaje, hint: 'columnas.1.tipo' },
      }),
    ).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje },
      porCampo: { 'columnas.1.tipo': mensaje },
    })
  })

  it('un 22023 con otro hint queda arriba, sin campo', () => {
    expect(
      resultadoDeCrear({ data: null, error: { code: '22023', message: 'Otra.', hint: 'x' } }),
    ).toEqual({ ok: false, error: { codigo: 'regla', mensaje: 'Otra.' } })
  })

  it('una respuesta con otra forma es inesperada', () => {
    expect(resultadoDeCrear({ data: { id: 'x' }, error: null })).toMatchObject({
      ok: false,
      error: { codigo: 'inesperado' },
    })
  })
})

describe('resultadoDeColumnas', () => {
  it('entra: la versión nueva', () => {
    expect(resultadoDeColumnas({ data: { version: 3 }, error: null })).toEqual({
      ok: true,
      data: { version: 3 },
    })
  })

  it('la columna en uso (23503) llega tal cual, no como el texto técnico de «column»', () => {
    const mensaje = 'La columna «País» la usa la fórmula publicada de Japón.'
    expect(resultadoDeColumnas({ data: null, error: { code: '23503', message: mensaje } })).toEqual(
      { ok: false, error: { codigo: 'regla', mensaje } },
    )
  })

  it('el PT409 es un conflicto con el mensaje de la base', () => {
    const mensaje = 'Ana publicó la versión 3 de esta tabla hace 2 min.'
    expect(resultadoDeColumnas({ data: null, error: { code: 'PT409', message: mensaje } })).toEqual(
      { ok: false, error: { codigo: 'conflicto', mensaje } },
    )
  })

  it('sin permiso en un origen que la usa (42501) llega tal cual', () => {
    const mensaje = 'La usa la fórmula de Japón, donde no tienes «cotizaciones.configurar».'
    expect(resultadoDeColumnas({ data: null, error: { code: '42501', message: mensaje } })).toEqual(
      { ok: false, error: { codigo: 'sin_permiso', mensaje } },
    )
  })

  it('otro código pasa por el traductor genérico', () => {
    expect(
      resultadoDeColumnas({ data: null, error: { code: '57014', message: 'canceling statement' } }),
    ).toMatchObject({ ok: false, error: { codigo: 'inesperado' } })
  })
})

describe('resultadoDeDesactivar', () => {
  it('entra: el id', () => {
    expect(resultadoDeDesactivar({ data: { id: TABLA }, error: null })).toEqual({
      ok: true,
      data: { id: TABLA },
    })
  })

  it('en uso: el mensaje con quién la usa', () => {
    const mensaje =
      'La usa la fórmula publicada de Japón: quítala de esa fórmula para desactivarla.'
    expect(
      resultadoDeDesactivar({
        data: null,
        error: { code: '23503', message: mensaje, hint: 'tabla' },
      }),
    ).toEqual({ ok: false, error: { codigo: 'regla', mensaje } })
  })
})
