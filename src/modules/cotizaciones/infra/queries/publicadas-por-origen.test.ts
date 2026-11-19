import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import type { Database } from '@/shared/types/database.types'

vi.mock('server-only', () => ({}))
vi.mock('@/shared/lib/supabase/server', () => ({ createClient: vi.fn() }))

const {
  consultaDeLasFormulasPublicadas,
  consultaDeLasPlantillasPublicadas,
  getPublicadasPorOrigen,
} = await import('./publicadas-por-origen')

type Llamada = [string, ...unknown[]]

function clienteFalso() {
  const llamadas: Llamada[] = []
  const consulta: Record<string, unknown> = {}
  for (const metodo of ['select', 'eq', 'in', 'limit']) {
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

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

describe('las consultas de lo publicado de cada origen', () => {
  it('la fórmula publicada de cada origen pedido: a lo sumo una fila por origen', () => {
    const { cliente, llamadas } = clienteFalso()
    void consultaDeLasFormulasPublicadas(cliente, [A, B])
    expect(llamadas).toEqual([
      ['from', 'formulas'],
      ['select', 'origen_id, version'],
      ['eq', 'estado', 'publicada'],
      ['in', 'origen_id', [A, B]],
      ['limit', 2],
    ])
  })

  it('la plantilla publicada de cada origen pedido: a lo sumo una fila por origen', () => {
    const { cliente, llamadas } = clienteFalso()
    void consultaDeLasPlantillasPublicadas(cliente, [A])
    expect(llamadas).toEqual([
      ['from', 'plantillas_tarjeta'],
      ['select', 'origen_id'],
      ['eq', 'estado', 'publicada'],
      ['in', 'origen_id', [A]],
      ['limit', 1],
    ])
  })
})

describe('getPublicadasPorOrigen', () => {
  it('sin ids no consulta; un id que no es uuid es un error', async () => {
    const vacio = await getPublicadasPorOrigen([])
    expect(vacio.ok && vacio.data.size).toBe(0)
    const malo = await getPublicadasPorOrigen(['general'])
    expect(malo.ok).toBe(false)
  })
})
