import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import type { PedidoDeCambiarCabecera } from '../../../entities/formula/repositorio'
import { MOTIVO_SIN_PERMISO_DE_FORMULA } from '../../../entities/formula/publicacion'

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const OTRO_ORIGEN = '44444444-4444-4444-8444-444444444444'
const PUBLICADA = '22222222-2222-4222-8222-222222222222'
const NUEVA = '33333333-3333-4333-8333-333333333333'
const PERSONA = '55555555-5555-4555-8555-555555555555'

const h = vi.hoisted(() => ({
  permisos: [] as { clave: string; origen_id: string | null; alcance: 'propios' | 'todos' }[],
  pedidos: [] as PedidoDeCambiarCabecera[],
  respuesta: null as Resultado<string> | null,
  cache: {
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
    updateTag: vi.fn(),
    refresh: vi.fn(),
  },
}))

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => h.cache)
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: { getClaims: () => Promise.resolve({ data: { claims: { sub: PERSONA } } }) },
      rpc: (nombre: string) =>
        Promise.resolve(
          nombre === 'mis_permisos'
            ? { data: h.permisos, error: null }
            : { data: null, error: { message: `rpc inesperada: ${nombre}` } },
        ),
    }),
}))
vi.mock('../../../areas/formula/composicion', () => ({
  repositorioDeLaFormula: {
    cambiarCabecera: (pedido: PedidoDeCambiarCabecera) => {
      h.pedidos.push(pedido)
      return Promise.resolve(h.respuesta)
    },
  },
}))

const { cambiarCabecera } = await import('./cambiar-cabecera')

const pedido = {
  origenId: ORIGEN,
  modoPorDefecto: 'unificado',
  verTotalBsPorDefecto: true,
  modosVisibles: ['unificado'],
  publicadaEsperada: PUBLICADA,
}
const configura = (origenId: string) => [
  { clave: 'cotizaciones.configurar', origen_id: origenId, alcance: 'todos' as const },
]

beforeEach(() => {
  h.permisos = configura(ORIGEN)
  h.pedidos.length = 0
  h.respuesta = { ok: true, data: NUEVA }
  for (const espia of Object.values(h.cache)) {
    espia.mockClear()
  }
})

describe('cambiarCabecera', () => {
  it('sin cotizaciones.configurar del origen no escribe', async () => {
    h.permisos = configura(OTRO_ORIGEN)
    const respuesta = await cambiarCabecera(pedido)
    expect(respuesta.data).toEqual({
      ok: false,
      error: { codigo: 'sin_permiso', mensaje: MOTIVO_SIN_PERMISO_DE_FORMULA },
    })
    expect(h.pedidos).toEqual([])
  })

  it('entra: manda las tres claves y la esperada tal cual, devuelve el id nuevo y no revalida', async () => {
    const respuesta = await cambiarCabecera(pedido)
    expect(h.pedidos).toEqual([pedido])
    expect(respuesta.data).toEqual({ ok: true, data: NUEVA })
    expect(h.cache.revalidatePath).not.toHaveBeenCalled()
    expect(h.cache.refresh).not.toHaveBeenCalled()
  })

  it('un conflicto llega tal cual', async () => {
    h.respuesta = {
      ok: false,
      error: { codigo: 'conflicto', mensaje: 'Ana publicó la versión 3.' },
    }
    expect((await cambiarCabecera(pedido)).data).toEqual(h.respuesta)
  })

  it('una entrada que no pasa el esquema (sin visibles, esperada que no es un id) no llega al repositorio', async () => {
    const respuesta = await cambiarCabecera({
      ...pedido,
      modosVisibles: [],
      publicadaEsperada: 'x',
    })
    expect(respuesta.data).toBeUndefined()
    expect(respuesta.validationErrors).toBeDefined()
    expect(h.pedidos).toEqual([])
  })
})

describe('cambiar-cabecera.ts, leído', () => {
  const codigo = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), 'cambiar-cabecera.ts'),
    'utf8',
  )
    .split('\n')
    .filter((linea) => !linea.trim().startsWith('//'))
    .join('\n')

  it('no importa next/cache ni llama a revalidar o refrescar', () => {
    expect(codigo).not.toMatch(/next\/cache/)
    expect(codigo).not.toMatch(/\b(revalidatePath|revalidateTag|updateTag|refresh)\s*\(/)
  })
})
