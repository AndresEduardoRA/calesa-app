import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/shared/types/database.types'
import { consultaDeLaCabecera, leerCabeceraSobre } from './consulta-de-la-cabecera'

type Llamada = [string, ...unknown[]]

// Un cliente que anota cada llamada de la consulta y responde lo que se le da.
function clienteFalso(respuesta: {
  data: unknown
  error: { message: string; code?: string } | null
}) {
  const llamadas: Llamada[] = []
  const consulta: Record<string, unknown> = {}
  for (const metodo of ['select', 'eq', 'limit']) {
    consulta[metodo] = (...args: unknown[]) => {
      llamadas.push([metodo, ...args])
      return consulta
    }
  }
  consulta['then'] = (resolver: (valor: unknown) => unknown) =>
    Promise.resolve(respuesta).then(resolver)
  const cliente = {
    from: (nombre: string) => {
      llamadas.push(['from', nombre])
      return consulta
    },
  }
  return { cliente: cliente as unknown as SupabaseClient<Database>, llamadas }
}

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const PUBLICADA = '22222222-2222-4222-8222-222222222222'
const MODOS = [
  { clave: 'paralelo', nombre: 'Paralelo' },
  { clave: 'unificado', nombre: 'Unificado' },
]

describe('consultaDeLaCabecera', () => {
  it('la publicada de la fórmula activa del origen, una fila, con id, versión y sólo la cabecera del diseño', () => {
    const { cliente, llamadas } = clienteFalso({ data: [], error: null })
    void consultaDeLaCabecera(cliente, ORIGEN)
    expect(llamadas).toEqual([
      ['from', 'formulas'],
      [
        'select',
        'id, version, cabecera:diseno->cabecera, formulas_del_origen!formulas_formula_del_origen_fkey!inner()',
      ],
      ['eq', 'origen_id', ORIGEN],
      ['eq', 'estado', 'publicada'],
      ['eq', 'formulas_del_origen.activa', true],
      ['limit', 1],
    ])
  })
})

describe('leerCabeceraSobre', () => {
  it('lee los modos, «Ver total» y lo que trae por defecto', async () => {
    const { cliente } = clienteFalso({
      data: [
        {
          id: PUBLICADA,
          version: 4,
          cabecera: {
            modos: MODOS.map((m) => ({ ...m, buckets: [], total_en: 'tc' })),
            ver_total_bs: true,
            modo_por_defecto: 'unificado',
            modos_visibles: ['unificado'],
          },
        },
      ],
      error: null,
    })
    expect(await leerCabeceraSobre(cliente, ORIGEN)).toEqual({
      ok: true,
      data: {
        publicadaId: PUBLICADA,
        version: 4,
        modos: MODOS,
        verTotalBs: true,
        modoPorDefecto: 'unificado',
        verTotalBsPorDefecto: false,
        modosVisibles: ['unificado'],
      },
    })
  })

  it('sin publicada (o sin permiso: la RLS no la deja ver), nulo', async () => {
    const { cliente } = clienteFalso({ data: [], error: null })
    expect(await leerCabeceraSobre(cliente, ORIGEN)).toEqual({ ok: true, data: null })
  })

  it('una fila que no se entiende y un error de la base son errores', async () => {
    const rara = clienteFalso({ data: [{ id: 'x' }], error: null })
    expect((await leerCabeceraSobre(rara.cliente, ORIGEN)).ok).toBe(false)
    const caida = clienteFalso({ data: null, error: { message: 'caída', code: '500' } })
    expect((await leerCabeceraSobre(caida.cliente, ORIGEN)).ok).toBe(false)
  })
})
