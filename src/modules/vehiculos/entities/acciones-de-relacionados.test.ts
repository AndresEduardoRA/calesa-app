import { describe, expect, it } from 'vitest'
import {
  accionesDeLaFila,
  accionesDeTodoVacio,
  accionesDelGrupo,
  rutaParaCotizarRelacionado,
  type AnclaDeLead,
  type AnclaDeVehiculo,
  type ContextoDeAcciones,
  type ParaRelacionados,
} from './acciones-de-relacionados'
import type { FilaRelacionada, LeadRelacionado, VehiculoRelacionado } from './relacionados'

const ORIGEN = '00000000-0000-4000-8000-0000000000a1'
const VEHICULO = '00000000-0000-4000-8000-0000000000b1'
const LEAD = '00000000-0000-4000-8000-0000000000c1'

const PARA: ParaRelacionados = {
  cotizarEn: [{ origenId: ORIGEN, ruta: `/cotizaciones/nuevo?origen=${ORIGEN}` }],
  claveDelVehiculo: 'vehiculo',
  claveDelLead: 'lead',
  rutaDeCotizacion: '/cotizaciones/:id',
  editarLeads: true,
}

const ANCLA_V: AnclaDeVehiculo = {
  lado: 'vehiculo',
  vehiculoId: VEHICULO,
  origenId: ORIGEN,
  editable: true,
}
const ANCLA_L: AnclaDeLead = { lado: 'lead', leadId: LEAD, puedoActuar: true }
const contexto = (
  ancla: ContextoDeAcciones['ancla'],
  cambios: Partial<ContextoDeAcciones> = {},
): ContextoDeAcciones => ({ lugar: 'ficha', ancla, para: PARA, ...cambios })

const lead = (puedoActuar: boolean): LeadRelacionado => ({
  leadId: LEAD,
  nombre: 'Ana',
  numeros: { numero: null, numeroPropio: null, creadorDelPropio: null },
  enCartera: puedoActuar,
  puedoActuar,
})
const vehiculo = (editable: boolean): VehiculoRelacionado => ({
  vehiculoId: VEHICULO,
  numero: 7,
  titulo: 'Toyota',
  actualizadoEn: '2026-11-14T10:00:00+00:00',
  origenId: ORIGEN,
  origenNombre: 'USA',
  portada: null,
  editable,
})
const filaDeLead = (
  detalle: FilaRelacionada<LeadRelacionado>['detalle'],
  puedoActuar = true,
): FilaRelacionada<LeadRelacionado> => ({ contraparte: lead(puedoActuar), detalle })
const filaDeVehiculo = (
  detalle: FilaRelacionada<VehiculoRelacionado>['detalle'],
  editable = true,
): FilaRelacionada<VehiculoRelacionado> => ({ contraparte: vehiculo(editable), detalle })

const INTERES = {
  tipo: 'interesado',
  nota: null,
  creadoEn: '2026-11-01T00:00:00+00:00',
  porNombre: null,
} as const
const VINCULO = { tipo: 'vinculado', desde: '2026-11-01T00:00:00+00:00' } as const
const COTIZADO = {
  tipo: 'cotizado',
  cotizacion: { id: 'cot-1', numero: 3, clase: 'preventa', creadoEn: '2026-11-02T00:00:00+00:00' },
} as const

const claves = (acciones: { tipo: string; clave?: string; etiqueta: string }[]) =>
  acciones.map((a) => a.etiqueta)

describe('rutaParaCotizarRelacionado', () => {
  it('suma el vehículo y el lead a la hoja del origen', () => {
    expect(
      rutaParaCotizarRelacionado(PARA, { origenId: ORIGEN, vehiculoId: VEHICULO, leadId: LEAD }),
    ).toBe(`/cotizaciones/nuevo?origen=${ORIGEN}&vehiculo=${VEHICULO}&lead=${LEAD}`)
  })
  it('sin lead sólo lleva el vehículo; en un origen donde no se cotiza, nada', () => {
    expect(
      rutaParaCotizarRelacionado(PARA, { origenId: ORIGEN, vehiculoId: VEHICULO, leadId: null }),
    ).toBe(`/cotizaciones/nuevo?origen=${ORIGEN}&vehiculo=${VEHICULO}`)
    expect(
      rutaParaCotizarRelacionado(PARA, { origenId: 'otro', vehiculoId: VEHICULO, leadId: LEAD }),
    ).toBeNull()
  })
})

describe('accionesDeLaFila desde el vehículo', () => {
  it('un interesado de la cartera se puede quitar; uno fuera de ella, no', () => {
    expect(claves(accionesDeLaFila(filaDeLead(INTERES, true), contexto(ANCLA_V)))).toEqual([
      'Cotizar',
      'Quitar interés',
    ])
    expect(claves(accionesDeLaFila(filaDeLead(INTERES, false), contexto(ANCLA_V)))).toEqual([
      'Cotizar',
    ])
  })
  it('el vinculado se desvincula en la ficha con su confirmación, y en la unidad lleva a la ficha', () => {
    expect(accionesDeLaFila(filaDeLead(VINCULO), contexto(ANCLA_V)).at(-1)).toMatchObject({
      tipo: 'desvincular',
      modo: 'confirmar',
    })
    expect(
      accionesDeLaFila(filaDeLead(VINCULO), contexto(ANCLA_V, { lugar: 'logistica' })).at(-1),
    ).toMatchObject({
      tipo: 'enlace',
      href: `/vehiculos/${VEHICULO}?panel=desvincular`,
    })
  })
  it('sin editar el vehículo no se desvincula', () => {
    expect(
      claves(accionesDeLaFila(filaDeLead(VINCULO), contexto({ ...ANCLA_V, editable: false }))),
    ).toEqual(['Cotizar'])
  })
  it('un cotizado ofrece ver su cotización (sólo si se ven cotizaciones) y cotizar de nuevo', () => {
    expect(claves(accionesDeLaFila(filaDeLead(COTIZADO), contexto(ANCLA_V)))).toEqual([
      'Ver cotización',
      'Cotizar',
    ])
    const sinVer = contexto(ANCLA_V, { para: { ...PARA, rutaDeCotizacion: null, cotizarEn: [] } })
    expect(accionesDeLaFila(filaDeLead(COTIZADO), sinVer)).toEqual([])
    expect(accionesDeLaFila(filaDeLead(COTIZADO), contexto(ANCLA_V))[0]).toMatchObject({
      href: '/cotizaciones/cot-1',
    })
  })
})

describe('accionesDeLaFila desde el lead', () => {
  it('quitar interés sólo con la cartera del lead', () => {
    expect(claves(accionesDeLaFila(filaDeVehiculo(INTERES), contexto(ANCLA_L)))).toEqual([
      'Cotizar',
      'Quitar interés',
    ])
    expect(
      claves(
        accionesDeLaFila(filaDeVehiculo(INTERES), contexto({ ...ANCLA_L, puedoActuar: false })),
      ),
    ).toEqual(['Cotizar'])
  })
  it('desvincular: en el lugar con la cartera; sin ella, a la ficha del lead con la confirmación; sin editar el vehículo, nada', () => {
    expect(accionesDeLaFila(filaDeVehiculo(VINCULO), contexto(ANCLA_L)).at(-1)).toMatchObject({
      tipo: 'desvincular',
      modo: 'directo',
    })
    expect(
      accionesDeLaFila(filaDeVehiculo(VINCULO), contexto({ ...ANCLA_L, puedoActuar: false })).at(
        -1,
      ),
    ).toMatchObject({
      tipo: 'enlace',
      href: `/leads/${LEAD}?seccion=vehiculos&panel=desvincular&vinculado=${VEHICULO}`,
    })
    expect(claves(accionesDeLaFila(filaDeVehiculo(VINCULO, false), contexto(ANCLA_L)))).toEqual([
      'Cotizar',
    ])
  })
})

describe('accionesDelGrupo', () => {
  it('vehículo: vincular sólo sin vínculo (ni uno oculto) y editando; marcar con leads.editar', () => {
    const vacio = { tipo: 'vinculado', filas: 0, ocultos: 0 } as const
    expect(claves(accionesDelGrupo(vacio, contexto(ANCLA_V)))).toEqual(['Vincular a un lead'])
    // Un vínculo oculto no ofrece vincular (frena), pero quien edita el vehículo lo puede desvincular desde el grupo.
    expect(accionesDelGrupo({ ...vacio, ocultos: 1 }, contexto(ANCLA_V))).toEqual([
      { tipo: 'desvincular', etiqueta: 'Desvincular', modo: 'confirmar' },
    ])
    expect(
      accionesDelGrupo({ ...vacio, ocultos: 1 }, contexto(ANCLA_V, { lugar: 'logistica' }))[0],
    ).toMatchObject({
      tipo: 'enlace',
      href: `/vehiculos/${VEHICULO}?panel=desvincular`,
    })
    expect(
      accionesDelGrupo({ ...vacio, ocultos: 1 }, contexto({ ...ANCLA_V, editable: false })),
    ).toEqual([])
    expect(accionesDelGrupo({ ...vacio, filas: 1 }, contexto(ANCLA_V))).toEqual([])
    expect(accionesDelGrupo(vacio, contexto({ ...ANCLA_V, editable: false }))).toEqual([])
    expect(
      accionesDelGrupo(vacio, contexto(ANCLA_V, { para: { ...PARA, editarLeads: false } })),
    ).toEqual([])
    expect(
      claves(accionesDelGrupo({ tipo: 'interesado', filas: 2, ocultos: 0 }, contexto(ANCLA_V))),
    ).toEqual(['Marcar un interesado'])
    expect(
      accionesDelGrupo(
        { tipo: 'interesado', filas: 0, ocultos: 0 },
        contexto(ANCLA_V, { para: { ...PARA, editarLeads: false } }),
      ),
    ).toEqual([])
  })
  it('el selector se abre en la ficha y en los demás lugares lleva a ella', () => {
    const grupo = { tipo: 'interesado', filas: 0, ocultos: 0 } as const
    expect(accionesDelGrupo(grupo, contexto(ANCLA_V))[0]).toMatchObject({
      tipo: 'elegir-lead',
      clave: 'marcar-interesado',
    })
    expect(accionesDelGrupo(grupo, contexto(ANCLA_V, { lugar: 'logistica' }))[0]).toMatchObject({
      tipo: 'enlace',
      href: `/vehiculos/${VEHICULO}?panel=marcar-interesado`,
    })
  })
  it('un cotizado vacío ofrece cotizar el vehículo sin lead', () => {
    expect(
      accionesDelGrupo({ tipo: 'cotizado', filas: 0, ocultos: 0 }, contexto(ANCLA_V))[0],
    ).toMatchObject({
      etiqueta: 'Cotizar',
      href: `/cotizaciones/nuevo?origen=${ORIGEN}&vehiculo=${VEHICULO}`,
    })
    expect(accionesDelGrupo({ tipo: 'cotizado', filas: 1, ocultos: 0 }, contexto(ANCLA_V))).toEqual(
      [],
    )
  })
})

describe('accionesDelGrupo desde el lead y el vacío', () => {
  it('lead: ningún grupo ofrece nada («Vincular o marcar» va en el título del bloque «Vehículos»)', () => {
    for (const tipo of ['vinculado', 'interesado', 'cotizado'] as const) {
      expect(accionesDelGrupo({ tipo, filas: 0, ocultos: 0 }, contexto(ANCLA_L))).toEqual([])
      expect(accionesDelGrupo({ tipo, filas: 2, ocultos: 0 }, contexto(ANCLA_L))).toEqual([])
    }
  })
  it('todo vacío: vincular y marcar desde el vehículo; nada desde el lead', () => {
    expect(claves(accionesDeTodoVacio(contexto(ANCLA_V)))).toEqual([
      'Vincular a un lead',
      'Marcar un interesado',
    ])
    expect(accionesDeTodoVacio(contexto(ANCLA_L))).toEqual([])
  })
})
