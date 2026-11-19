import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import type { Database } from '@/shared/types/database.types'
import { retocarSobre, SIN_PERMISO_DE_RETOCAR } from './rpc-de-los-retoques'

const ID = '11111111-1111-4111-8111-111111111111'
const VERSION = '2026-11-18T19:00:00.123456+00:00'

const cliente = (respuesta: { data: unknown; error: unknown }) => {
  const rpc = vi.fn(() => Promise.resolve(respuesta))
  return { rpc, cliente: { rpc } as unknown as SupabaseClient<Database> }
}

describe('retocarSobre', () => {
  it('llama a la RPC con la versión tal cual y lee la respuesta', async () => {
    const { rpc, cliente: c } = cliente({
      data: { actualizado_en: VERSION, retoques: { filas_ocultas: ['f'] }, repetido: false },
      error: null,
    })
    const r = await retocarSobre(c, {
      id: ID,
      esperado: VERSION,
      retoques: { filas_ocultas: ['f'] },
    })
    expect(rpc).toHaveBeenCalledWith('cotizacion_retocar_tarjeta', {
      p_id: ID,
      p_actualizado_en_esperado: VERSION,
      p_retoques: { filas_ocultas: ['f'] },
    })
    expect(r).toEqual({
      ok: true,
      data: { actualizadoEn: VERSION, retoques: { filas_ocultas: ['f'] }, repetido: false },
    })
  })

  it('volver a la plantilla manda nulo y lee los retoques nulos', async () => {
    const { rpc, cliente: c } = cliente({
      data: { actualizado_en: VERSION, retoques: null, repetido: true },
      error: null,
    })
    const r = await retocarSobre(c, { id: ID, esperado: VERSION, retoques: null })
    expect(rpc.mock.calls[0]).toEqual([
      'cotizacion_retocar_tarjeta',
      { p_id: ID, p_actualizado_en_esperado: VERSION, p_retoques: null },
    ])
    expect(r).toMatchObject({ ok: true, data: { retoques: null, repetido: true } })
  })
})

describe('retocarSobre: los rechazos', () => {
  it('una regla de los retoques: su mensaje y el donde como causa', async () => {
    const { cliente: c } = cliente({
      data: null,
      error: { code: '22023', message: 'x', details: 'texto_largo', hint: 'celdas.c_saludo' },
    })
    expect(await retocarSobre(c, { id: ID, esperado: VERSION, retoques: {} })).toEqual({
      ok: false,
      error: {
        codigo: 'validacion',
        mensaje: 'El texto de la celda «c_saludo» tiene como máximo 300 caracteres.',
        causa: 'celdas.c_saludo',
      },
    })
  })

  it('el PT409 con el mensaje de la base, el 42501 con el propio y lo demás como siempre', async () => {
    const pt = cliente({
      data: null,
      error: { code: 'PT409', message: 'Ana cambió esta cotización hace 1 min.' },
    })
    expect(await retocarSobre(pt.cliente, { id: ID, esperado: VERSION, retoques: {} })).toEqual({
      ok: false,
      error: { codigo: 'conflicto', mensaje: 'Ana cambió esta cotización hace 1 min.' },
    })
    const sin = cliente({
      data: null,
      error: { code: '42501', message: 'No tienes acceso a esta cotización.' },
    })
    expect(await retocarSobre(sin.cliente, { id: ID, esperado: VERSION, retoques: {} })).toEqual({
      ok: false,
      error: { codigo: 'sin_permiso', mensaje: SIN_PERMISO_DE_RETOCAR },
    })
    const otro = cliente({
      data: null,
      error: { code: '22023', message: 'Falta el identificador.', details: null },
    })
    expect(
      await retocarSobre(otro.cliente, { id: ID, esperado: VERSION, retoques: {} }),
    ).toMatchObject({
      ok: false,
      error: { codigo: 'regla', mensaje: 'Falta el identificador.' },
    })
  })

  it('una respuesta que no es la prometida es un fallo inesperado', async () => {
    const { cliente: c } = cliente({ data: { actualizado_en: VERSION }, error: null })
    expect(await retocarSobre(c, { id: ID, esperado: VERSION, retoques: null })).toMatchObject({
      ok: false,
      error: { codigo: 'inesperado' },
    })
  })
})
