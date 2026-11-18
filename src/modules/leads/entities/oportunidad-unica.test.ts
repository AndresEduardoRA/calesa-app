import { describe, expect, it } from 'vitest'
import type { Embudo } from './embudo'
import {
  abiertaDelRechazo,
  abiertaEnElPorDefecto,
  abiertasDeLoCargado,
  abiertasPorEmbudoDesde,
  accionesDeLaAbierta,
  accionesDelRechazo,
  embudosParaCrear,
  type AbiertaEnEmbudo,
} from './oportunidad-unica'

const VENTAS = '11111111-1111-4111-8111-111111111111'
const POSVENTA = '33333333-3333-4333-8333-333333333333'
const FLOTAS = '44444444-4444-4444-8444-444444444444'
const ABIERTA = '22222222-2222-4222-8222-222222222222'
const LEAD = '55555555-5555-4555-8555-555555555555'

const embudo = (id: string, nombre: string, esDefault = false): Embudo => ({
  id,
  nombre,
  esDefault,
  actualizadoEn: '2026-11-18T10:00:00Z',
  etapas: [],
})
const EMBUDOS = [
  embudo(VENTAS, 'Ventas', true),
  embudo(POSVENTA, 'Posventa'),
  embudo(FLOTAS, 'Flotas'),
]
const abierta = (embudoId: string, embudoNombre: string, esDefault = false): AbiertaEnEmbudo => ({
  embudoId,
  embudoNombre,
  esDefault,
  oportunidadId: ABIERTA,
})

describe('abiertasPorEmbudoDesde', () => {
  it('lee la primera página y descarta lo roto', () => {
    expect(
      abiertasPorEmbudoDesde({
        abiertas_por_embudo: [
          { embudo_id: VENTAS, embudo_nombre: 'Ventas', es_default: true, oportunidad_id: ABIERTA },
          {
            embudo_id: 'no-es-un-id',
            embudo_nombre: 'Rota',
            es_default: false,
            oportunidad_id: ABIERTA,
          },
        ],
      }),
    ).toEqual([abierta(VENTAS, 'Ventas', true)])
  })
  it('sin la clave (una página con cursor), ninguna', () => {
    expect(abiertasPorEmbudoDesde({ oportunidades: [] })).toEqual([])
    expect(abiertasPorEmbudoDesde(null)).toEqual([])
  })
})

describe('abiertaEnElPorDefecto', () => {
  it('la del embudo por defecto, o null', () => {
    expect(
      abiertaEnElPorDefecto([abierta(POSVENTA, 'Posventa'), abierta(VENTAS, 'Ventas', true)])
        ?.embudoId,
    ).toBe(VENTAS)
    expect(abiertaEnElPorDefecto([abierta(POSVENTA, 'Posventa')])).toBeNull()
  })
})

describe('embudosParaCrear', () => {
  it('sin abiertas, todos libres y arranca en el de por defecto', () => {
    const { opciones, inicial } = embudosParaCrear(EMBUDOS, [])
    expect(inicial).toBe('')
    expect(opciones).toEqual([
      { valor: '', etiqueta: 'Ventas (por defecto)', deshabilitada: false },
      { valor: POSVENTA, etiqueta: 'Posventa', deshabilitada: false },
      { valor: FLOTAS, etiqueta: 'Flotas', deshabilitada: false },
    ])
  })
  it('el de por defecto ocupado va apagado con el motivo y arranca en el primero libre', () => {
    const { opciones, inicial } = embudosParaCrear(EMBUDOS, [
      abierta(VENTAS, 'Ventas', true),
      abierta(POSVENTA, 'Posventa'),
    ])
    expect(inicial).toBe(FLOTAS)
    expect(opciones.map((o) => [o.etiqueta, o.deshabilitada])).toEqual([
      ['Ventas (por defecto) · Ya tiene una abierta', true],
      ['Posventa · Ya tiene una abierta', true],
      ['Flotas', false],
    ])
  })
  it('sin ninguno libre, null: crear se apaga', () => {
    expect(
      embudosParaCrear([embudo(VENTAS, 'Ventas', true)], [abierta(VENTAS, 'Ventas', true)]).inicial,
    ).toBeNull()
  })
  it('sin embudos todavía, el de por defecto (lo crea la base)', () => {
    expect(embudosParaCrear([], []).inicial).toBe('')
  })
})

describe('abiertaDelRechazo', () => {
  it('el id de la abierta que trajo el rechazo de la guarda', () => {
    expect(
      abiertaDelRechazo({ ok: false, error: { codigo: 'regla', mensaje: 'x' }, abierta: ABIERTA }),
    ).toBe(ABIERTA)
  })
  it('otro rechazo, o un id roto, null', () => {
    expect(abiertaDelRechazo({ ok: false, error: { codigo: 'regla', mensaje: 'x' } })).toBeNull()
    expect(abiertaDelRechazo({ ok: false, abierta: 'no-es-un-id' })).toBeNull()
    expect(abiertaDelRechazo(null)).toBeNull()
  })
})

describe('accionesDeLaAbierta', () => {
  it('«Abrir esa» lleva al panel de la abierta en la ficha', () => {
    expect(accionesDeLaAbierta(LEAD, ABIERTA)).toEqual({
      acciones: [
        {
          tipo: 'ir',
          etiqueta: 'Abrir esa',
          ruta: `/leads/${LEAD}?seccion=oportunidades&panel=editar-oportunidad&oportunidad=${ABIERTA}`,
        },
      ],
      pedido: null,
    })
  })
})

describe('accionesDelRechazo', () => {
  it('con la abierta, «Abrir esa»; otro rechazo, ninguna', () => {
    expect(
      accionesDelRechazo(LEAD, { ok: false, abierta: ABIERTA }).acciones?.acciones[0]?.etiqueta,
    ).toBe('Abrir esa')
    expect(accionesDelRechazo(LEAD, { ok: false })).toEqual({})
  })
})

describe('abiertasDeLoCargado', () => {
  const op = (id: string, embudoId: string, estado: 'abierta' | 'ganada', nombre = 'Ventas') =>
    ({
      id,
      embudoId,
      estado,
      eliminada: false,
      embudo: { id: embudoId, nombre },
    }) as unknown as Parameters<typeof abiertasDeLoCargado>[1][number]
  const otra = '66666666-6666-4666-8666-666666666666'
  it('con todas cargadas, lo cargado manda: una creada ocupa su embudo y una cerrada lo libera', () => {
    expect(abiertasDeLoCargado([], [op(ABIERTA, VENTAS, 'abierta')], false, EMBUDOS)).toEqual([
      abierta(VENTAS, 'Ventas', true),
    ])
    expect(
      abiertasDeLoCargado(
        [abierta(VENTAS, 'Ventas', true)],
        [op(ABIERTA, VENTAS, 'ganada')],
        false,
        EMBUDOS,
      ),
    ).toEqual([])
  })
  it('con más abiertas que las cargadas, suma las del servidor', () => {
    const delServidor = [abierta(POSVENTA, 'Posventa')]
    expect(
      abiertasDeLoCargado(delServidor, [op(otra, VENTAS, 'abierta')], true, EMBUDOS).map(
        (a) => a.embudoId,
      ),
    ).toEqual([VENTAS, POSVENTA])
  })
})
