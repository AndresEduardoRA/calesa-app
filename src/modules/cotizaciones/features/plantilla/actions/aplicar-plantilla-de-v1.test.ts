import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MOTIVO_SIN_PERMISO_DE_PLANTILLA } from '../../../entities/plantilla/escritura-de-la-plantilla'
import type { PedidoDeAplicar } from '../../../entities/plantillas-de-v1/pedido'

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const FDO = '77777777-7777-4777-8777-777777777777'
const OTRO_ORIGEN = '44444444-4444-4444-8444-444444444444'
const PERSONA = '55555555-5555-4555-8555-555555555555'
const HORA = '2026-11-07T15:00:00.123456+00:00'

const h = vi.hoisted(() => ({
  permisos: [] as { clave: string; origen_id: string | null; alcance: 'propios' | 'todos' }[],
  catalogo: [] as { clave: string; nombre: string; hex: string }[],
  pedidos: [] as PedidoDeAplicar[],
  respuesta: null as unknown,
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
vi.mock('../../../areas/plantilla/composicion', () => ({
  plantillasDeV1: {
    leerEstado: (formulaDelOrigenId: string) =>
      formulaDelOrigenId !== FDO
        ? Promise.reject(new Error(`leyó otra fórmula: ${formulaDelOrigenId}`))
        : Promise.resolve({
            ok: true,
            data: { formula: null, tarjeta: null, catalogo: h.catalogo },
          }),
    aplicar: (pedido: PedidoDeAplicar) => {
      h.pedidos.push(pedido)
      return Promise.resolve(h.respuesta)
    },
  },
}))

const { aplicarLaPlantillaDeV1 } = await import('./aplicar-plantilla-de-v1')

const entrada = {
  origenId: ORIGEN,
  formulaDelOrigenId: FDO,
  plantilla: 'usa' as const,
  formulaEsperada: null,
  plantillaEsperada: HORA,
}
const configura = (origenId: string) => [
  { clave: 'cotizaciones.configurar', origen_id: origenId, alcance: 'todos' as const },
]

beforeEach(() => {
  h.permisos = configura(ORIGEN)
  h.catalogo = []
  h.pedidos.length = 0
  h.respuesta = { ok: true, data: { formula: HORA, plantilla: HORA } }
  h.revalidatePath.mockClear()
})

describe('aplicarLaPlantillaDeV1', () => {
  it('sin cotizaciones.configurar del origen (o con el de otro) no llega a la base', async () => {
    for (const permisos of [[], configura(OTRO_ORIGEN)]) {
      h.permisos = permisos
      const r = await aplicarLaPlantillaDeV1(entrada)
      expect(r.data).toEqual({
        ok: false,
        error: { codigo: 'sin_permiso', mensaje: MOTIVO_SIN_PERMISO_DE_PLANTILLA },
      })
    }
    expect(h.pedidos).toEqual([])
  })

  it('los colores que no caben se dicen sin llamar a la base', async () => {
    h.catalogo = Array.from({ length: 46 }, (_, i) => ({
      clave: `c${i}`,
      nombre: `C ${i}`,
      hex: '#000000',
    }))
    const r = await aplicarLaPlantillaDeV1(entrada)
    expect(r.data).toEqual({
      ok: false,
      error: {
        codigo: 'regla',
        mensaje:
          'No hay lugar para 7 colores más en el catálogo (máximo 48): elimina alguno que no se use.',
      },
    })
    expect(h.pedidos).toEqual([])
  })

  it('manda el paquete del código con las claves del catálogo, un id por color nuevo y las esperadas, y revalida', async () => {
    // `v1_teal` ya existe con otro tono: va `v1_usa_teal`.
    h.catalogo = [{ clave: 'v1_teal', nombre: 'V1 teal', hex: '#000000' }]
    const r = await aplicarLaPlantillaDeV1(entrada)
    expect(r.data).toEqual({ ok: true, data: { formula: HORA, plantilla: HORA } })
    const [p] = h.pedidos
    expect(p).toMatchObject({
      origenId: ORIGEN,
      formulaDelOrigenId: FDO,
      formulaEsperada: null,
      plantillaEsperada: HORA,
    })
    expect(p?.pedido.nota).toBe('Empezado desde la plantilla de V1 «USA (subasta)».')
    expect(p?.pedido.crear.map((c) => c.clave)).toContain('v1_usa_teal')
    expect(p?.pedido.crear.every((c) => /^[0-9a-f-]{36}$/.test(c.id))).toBe(true)
    expect(new Set(p?.pedido.crear.map((c) => c.id)).size).toBe(p?.pedido.crear.length)
    expect(p?.pedido.tarjeta.celdas.find((c) => c.id === 'titulo')?.estilo?.fondo).toBe(
      'v1_usa_teal',
    )
    expect(h.revalidatePath).toHaveBeenCalledWith('/configuracion/origenes', 'layout')
  })

  it('un PT409 llega tal cual y no revalida', async () => {
    h.respuesta = {
      ok: false,
      error: { codigo: 'conflicto', mensaje: 'Ya hay un borrador: lo empezó Ana.' },
    }
    const r = await aplicarLaPlantillaDeV1(entrada)
    expect(r.data).toEqual({
      ok: false,
      error: { codigo: 'conflicto', mensaje: 'Ya hay un borrador: lo empezó Ana.' },
    })
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('una clave que no es de V1 o una hora sin zona no pasan el esquema', async () => {
    expect(
      (await aplicarLaPlantillaDeV1({ ...entrada, plantilla: 'otra' as 'usa' })).validationErrors,
    ).toBeDefined()
    expect(
      (await aplicarLaPlantillaDeV1({ ...entrada, plantillaEsperada: '2026-11-07' }))
        .validationErrors,
    ).toBeDefined()
    expect(h.pedidos).toEqual([])
  })
})
