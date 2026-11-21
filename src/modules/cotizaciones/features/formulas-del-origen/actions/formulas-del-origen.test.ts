import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MOTIVO_SIN_PERMISO_DE_FORMULAS,
  MOTIVO_SIN_PERMISO_DE_LA_COPIA,
} from '../../../entities/formulas-del-origen/resultado'

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const OTRO = '22222222-2222-4222-8222-222222222222'
const ID = '33333333-3333-4333-8333-333333333333'
const COPIA = '44444444-4444-4444-8444-444444444444'
const PERSONA = '55555555-5555-4555-8555-555555555555'
const HORA = '2026-11-20T15:00:00.123456+00:00'

const h = vi.hoisted(() => ({
  permisos: [] as { clave: string; origen_id: string | null; alcance: 'propios' | 'todos' }[],
  pedidos: [] as { caso: string; pedido: unknown }[],
  revalidatePath: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({
  revalidatePath: h.revalidatePath,
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
  refresh: vi.fn(),
}))
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
vi.mock('../../../areas/formulas-del-origen/composicion', () => {
  const registrar = (caso: string) => (pedido: unknown) => {
    h.pedidos.push({ caso, pedido })
    return Promise.resolve({ ok: true, data: { caso } })
  }
  return {
    formulasDelOrigenSupabase: {
      crear: registrar('crear'),
      renombrar: registrar('renombrar'),
      archivar: registrar('archivar'),
      eliminar: registrar('eliminar'),
      activar: registrar('activar'),
    },
  }
})

const { crearFormulaDelOrigen } = await import('./crear-formula')
const { renombrarFormulaDelOrigen } = await import('./renombrar-formula')
const { activarFormulaDelOrigen } = await import('./activar-formula')

const configura = (...origenes: string[]) =>
  origenes.map((origen_id) => ({
    clave: 'cotizaciones.configurar',
    origen_id,
    alcance: 'todos' as const,
  }))

const crear = {
  id: ID,
  origenId: ORIGEN,
  nombre: '  Flete  ',
  copiaDe: null,
  pieza: 'publicada' as const,
  origenDeLaCopia: null,
}

beforeEach(() => {
  h.permisos = configura(ORIGEN)
  h.pedidos.length = 0
  h.revalidatePath.mockClear()
})

describe('crearFormulaDelOrigen', () => {
  it('sin cotizaciones.configurar del origen no llega a la base', async () => {
    h.permisos = configura(OTRO)
    const r = await crearFormulaDelOrigen(crear)
    expect(r.data).toEqual({
      ok: false,
      error: { codigo: 'sin_permiso', mensaje: MOTIVO_SIN_PERMISO_DE_FORMULAS },
    })
    expect(h.pedidos).toEqual([])
  })

  it('copiar de otro origen pide también el permiso ahí', async () => {
    const r = await crearFormulaDelOrigen({ ...crear, copiaDe: COPIA, origenDeLaCopia: OTRO })
    expect(r.data).toEqual({
      ok: false,
      error: { codigo: 'sin_permiso', mensaje: MOTIVO_SIN_PERMISO_DE_LA_COPIA },
    })
    h.permisos = configura(ORIGEN, OTRO)
    await crearFormulaDelOrigen({ ...crear, copiaDe: COPIA, origenDeLaCopia: OTRO })
    expect(h.pedidos).toEqual([
      {
        caso: 'crear',
        pedido: { id: ID, origenId: ORIGEN, nombre: 'Flete', copiaDe: COPIA, pieza: 'publicada' },
      },
    ])
  })

  it('no revalida: la lista se vuelve a leer desde la pantalla', async () => {
    const r = await crearFormulaDelOrigen(crear)
    expect(r.data).toEqual({ ok: true, data: { caso: 'crear' } })
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('un nombre de más de 60 letras no pasa el esquema', async () => {
    const r = await crearFormulaDelOrigen({ ...crear, nombre: 'x'.repeat(61) })
    expect(r.validationErrors).toBeDefined()
    expect(h.pedidos).toEqual([])
  })
})

describe('renombrar y activar', () => {
  it('renombrar manda la versión vista y el nombre recortado', async () => {
    await renombrarFormulaDelOrigen({ id: ID, origenId: ORIGEN, esperada: HORA, nombre: ' Otra ' })
    expect(h.pedidos).toEqual([
      { caso: 'renombrar', pedido: { id: ID, esperada: HORA, nombre: 'Otra' } },
    ])
  })

  it('activar sin la nota no pasa el esquema; con ella manda las esperadas sin el origen', async () => {
    const entrada = {
      id: ID,
      origenId: ORIGEN,
      esperada: HORA,
      activaEsperada: null,
      borradorEsperado: HORA,
      publicadaEsperada: null,
      plantillaBorradorEsperado: null,
      plantillaPublicadaEsperada: COPIA,
      nota: '  ',
    }
    expect((await activarFormulaDelOrigen(entrada)).validationErrors).toBeDefined()
    await activarFormulaDelOrigen({ ...entrada, nota: 'Empieza el flete.' })
    const { origenId: _origen, ...sinOrigen } = entrada
    expect(h.pedidos).toEqual([
      { caso: 'activar', pedido: { ...sinOrigen, nota: 'Empieza el flete.' } },
    ])
  })
})
