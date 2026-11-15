import { describe, expect, it } from 'vitest'
import {
  paginaDeLeadsDesde,
  relacionadosDelLeadDesde,
  relacionadosDelVehiculoDesde,
} from './relacionados-lectura'

const V = '00000000-0000-4000-8000-0000000000b1'
const L = '00000000-0000-4000-8000-0000000000c1'
const O = '00000000-0000-4000-8000-0000000000a1'
const C = '00000000-0000-4000-8000-0000000000d1'

const lead = (extra: object = {}) => ({
  lead_id: L,
  nombre: 'Ana',
  numero: null,
  numero_propio: 12,
  numero_propio_creador: null,
  en_cartera: true,
  puedo_actuar: true,
  ...extra,
})
const grupo = (filas: object[], leidos = filas.length, ocultos = 0) => ({ filas, leidos, ocultos })
const delVehiculo = (cambios: object = {}) => ({
  titulo: 'Toyota Hilux',
  numero: 9,
  editable: true,
  actualizado_en: '2026-11-14T10:00:00+00:00',
  origen_id: O,
  vinculado: {
    fila: lead({ desde: '2026-10-01T00:00:00+00:00' }),
    oculto: false,
    con_anteriores: true,
  },
  interesados: grupo([
    lead({ nota: 'urgente', creado_en: '2026-11-01T00:00:00+00:00', por_nombre: null }),
  ]),
  cotizados: {
    ...grupo([
      lead({
        cotizacion: { id: C, numero: 5, clase: 'preventa', creado_en: '2026-11-02T00:00:00+00:00' },
      }),
    ]),
    ventana_llena: false,
  },
  ...cambios,
})

describe('relacionadosDelVehiculoDesde', () => {
  it('arma los tres grupos con sus conteos', () => {
    const r = relacionadosDelVehiculoDesde(V, delVehiculo())
    expect(r?.editable).toBe(true)
    expect(r?.conAnteriores).toBe(true)
    expect(r?.grupos.vinculado.conteo).toEqual({ n: 1, hayMas: false })
    expect(r?.grupos.interesado.filas[0]).toMatchObject({
      contraparte: { nombre: 'Ana', numeros: { numeroPropio: 12 }, puedoActuar: true },
      detalle: { tipo: 'interesado', nota: 'urgente' },
    })
    expect(r?.grupos.cotizado?.filas[0]?.detalle).toMatchObject({
      tipo: 'cotizado',
      cotizacion: { id: C, numero: 5 },
    })
  })

  it('el vínculo oculto es un grupo con un oculto y ninguna fila', () => {
    const r = relacionadosDelVehiculoDesde(
      V,
      delVehiculo({ vinculado: { fila: null, oculto: true, con_anteriores: false } }),
    )
    expect(r?.grupos.vinculado).toMatchObject({ filas: [], ocultos: 1, conteo: { n: 1 } })
  })

  it('sin cotizaciones.ver no hay grupo Cotizado', () => {
    expect(
      relacionadosDelVehiculoDesde(V, delVehiculo({ cotizados: null }))?.grupos.cotizado,
    ).toBeNull()
  })

  it('con más de 100 leídos el conteo es «100+» y hay más; en cotizados, también con la ventana llena', () => {
    const interesados = grupo([lead({ creado_en: 'x' })], 101, 100)
    const r = relacionadosDelVehiculoDesde(V, delVehiculo({ interesados }))
    expect(r?.grupos.interesado).toMatchObject({
      conteo: { n: 100, hayMas: true },
      ocultos: 100,
      hayMas: true,
    })
    const llena = { ...grupo([], 40, 0), ventana_llena: true }
    expect(
      relacionadosDelVehiculoDesde(V, delVehiculo({ cotizados: llena }))?.grupos.cotizado?.conteo,
    ).toEqual({ n: 40, hayMas: true })
  })

  it('hay más que las filas cuando hay visibles que no caben', () => {
    const r = relacionadosDelVehiculoDesde(
      V,
      delVehiculo({ interesados: grupo([lead({ creado_en: 'x' })], 6, 2) }),
    )
    expect(r?.grupos.interesado.hayMas).toBe(true)
  })

  it('una forma rota da null: una fila sin su detalle, un uuid que no lo es o un campo que falta', () => {
    expect(
      relacionadosDelVehiculoDesde(V, delVehiculo({ interesados: grupo([lead()]) })),
    ).toBeNull()
    expect(relacionadosDelVehiculoDesde(V, delVehiculo({ origen_id: 'no' }))).toBeNull()
    expect(relacionadosDelVehiculoDesde(V, { editable: true })).toBeNull()
    expect(relacionadosDelVehiculoDesde(V, null)).toBeNull()
  })
})

const vehiculo = (extra: object = {}) => ({
  id: V,
  numero: 9,
  titulo: 'Toyota Hilux',
  actualizado_en: '2026-11-14T10:00:00+00:00',
  origen_id: O,
  origen_nombre: 'USA',
  portada: null,
  editable: false,
  ...extra,
})

describe('relacionadosDelLeadDesde', () => {
  it('arma los grupos de vehículos y la bandera de la cartera', () => {
    const r = relacionadosDelLeadDesde(L, {
      puedo_actuar: false,
      vinculados: grupo([vehiculo({ desde: '2026-10-01T00:00:00+00:00' })]),
      interesados: grupo([], 3, 3),
      cotizados: null,
    })
    expect(r?.puedoActuar).toBe(false)
    expect(r?.grupos.vinculado.filas[0]?.contraparte).toMatchObject({
      vehiculoId: V,
      titulo: 'Toyota Hilux',
      origenId: O,
    })
    expect(r?.grupos.interesado).toMatchObject({
      ocultos: 3,
      conteo: { n: 3, hayMas: false },
      filas: [],
    })
    expect(r?.grupos.cotizado).toBeNull()
  })
})

describe('paginaDeLeadsDesde', () => {
  it('lee las filas y si la base cortó el recorrido', () => {
    const pagina = paginaDeLeadsDesde('interesado', {
      filas: [lead({ creado_en: 'x' })],
      cortada: true,
    })
    expect(pagina?.cortada).toBe(true)
    expect(pagina?.filas).toHaveLength(1)
    expect(pagina?.siguiente).toBeNull()
    const cortada = paginaDeLeadsDesde('interesado', {
      filas: [],
      cortada: true,
      siguiente: { en: '2026-11-01T00:00:00+00:00', id: L },
    })
    expect(cortada?.siguiente).toEqual({ en: '2026-11-01T00:00:00+00:00', id: L })
    expect(paginaDeLeadsDesde('interesado', { filas: [lead()], cortada: false })).toBeNull()
    expect(paginaDeLeadsDesde('interesado', { filas: 3 })).toBeNull()
  })
})
