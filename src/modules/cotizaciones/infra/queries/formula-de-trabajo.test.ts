import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import type { Database } from '@/shared/types/database.types'

vi.mock('server-only', () => ({}))

const { consultaDeLaFormulaDeTrabajo, leerFormulaDeTrabajoSobre } =
  await import('./formula-de-trabajo')

type Llamada = [string, ...unknown[]]

function clienteFalso(respuesta: { data: unknown; error: unknown } = { data: [], error: null }) {
  const llamadas: Llamada[] = []
  const consulta: Record<string, unknown> = {
    then: (resolver: (valor: unknown) => unknown) => Promise.resolve(respuesta).then(resolver),
  }
  for (const metodo of ['select', 'eq', 'is', 'order', 'limit']) {
    consulta[metodo] = (...args: unknown[]) => {
      llamadas.push([metodo, ...args])
      return consulta
    }
  }
  const cliente = {
    from: (nombre: string) => {
      llamadas.push(['from', nombre])
      return consulta
    },
  }
  return { cliente: cliente as unknown as SupabaseClient<Database>, llamadas }
}

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const FORMULA = '22222222-2222-4222-8222-222222222222'

describe('la fórmula de trabajo de un origen', () => {
  it('la activa primero y si no la más nueva sin archivar, una sola fila', () => {
    const { cliente, llamadas } = clienteFalso()
    void consultaDeLaFormulaDeTrabajo(cliente, ORIGEN)
    expect(llamadas).toEqual([
      ['from', 'formulas_del_origen'],
      ['select', 'id, nombre, activa, actualizado_en'],
      ['eq', 'origen_id', ORIGEN],
      ['is', 'archivada_en', null],
      ['order', 'activa', { ascending: false }],
      ['order', 'creado_en', { ascending: false }],
      ['order', 'id', { ascending: false }],
      ['limit', 1],
    ])
  })

  it('devuelve la fila con la hora tal cual el texto de la base', async () => {
    const { cliente } = clienteFalso({
      data: [
        {
          id: FORMULA,
          nombre: 'Fórmula',
          activa: true,
          actualizado_en: '2026-11-20T10:00:00.123456+00:00',
        },
      ],
      error: null,
    })
    expect(await leerFormulaDeTrabajoSobre(cliente, ORIGEN)).toEqual({
      ok: true,
      data: {
        id: FORMULA,
        nombre: 'Fórmula',
        activa: true,
        actualizadoEn: '2026-11-20T10:00:00.123456+00:00',
      },
    })
  })

  it('nula si el origen no tiene ninguna (o no se ve)', async () => {
    const { cliente } = clienteFalso()
    expect(await leerFormulaDeTrabajoSobre(cliente, ORIGEN)).toEqual({ ok: true, data: null })
  })

  it('un origen que no es un id no consulta; una fila con otra forma es un error de lectura', async () => {
    const vacio = clienteFalso()
    expect((await leerFormulaDeTrabajoSobre(vacio.cliente, 'x')).ok).toBe(false)
    expect(vacio.llamadas).toEqual([])
    const { cliente } = clienteFalso({ data: [{ id: FORMULA, nombre: 'F' }], error: null })
    expect(await leerFormulaDeTrabajoSobre(cliente, ORIGEN)).toEqual({
      ok: false,
      error: { codigo: 'inesperado', mensaje: 'No pudimos leer la fórmula del origen.' },
    })
  })

  it('el error de la base sube como valor', async () => {
    const { cliente } = clienteFalso({ data: null, error: { code: '42501', message: 'no' } })
    const leida = await leerFormulaDeTrabajoSobre(cliente, ORIGEN)
    expect(leida.ok).toBe(false)
  })
})
