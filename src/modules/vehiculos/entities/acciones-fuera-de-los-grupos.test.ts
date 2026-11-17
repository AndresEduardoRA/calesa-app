import { describe, expect, it } from 'vitest'
import type {
  AnclaDeLead,
  AnclaDeVehiculo,
  ContextoDeAcciones,
  ParaRelacionados,
} from './acciones-de-relacionados'
import { accionesFueraDeLosGrupos } from './acciones-fuera-de-los-grupos'
import type { GrupoDeRelacionados, GruposDeRelacionados, TipoDeRelacion } from './relacionados'

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

// Un grupo con `filas` visibles (sin datos: sólo cuenta cuántas) y `ocultos`.
const grupo = (tipo: TipoDeRelacion, filas = 0, ocultos = 0): GrupoDeRelacionados<unknown> => ({
  tipo,
  filas: Array.from({ length: filas }, () => ({
    contraparte: {},
    detalle: { tipo: 'vinculado' as const, desde: null },
  })),
  conteo: { n: filas + ocultos, hayMas: false },
  ocultos,
  hayMas: false,
})
const vacios = (): GruposDeRelacionados<unknown> => ({
  vinculado: grupo('vinculado'),
  interesado: grupo('interesado'),
  cotizado: grupo('cotizado'),
})

const etiquetas = (acciones: readonly { etiqueta: string }[]) => acciones.map((a) => a.etiqueta)

describe('accionesFueraDeLosGrupos desde un vehículo', () => {
  it('todo vacío con edición y `leads.editar`: vincular a la vista y marcar en el «⋯»', () => {
    const fuera = accionesFueraDeLosGrupos(vacios(), contexto(ANCLA_V))
    expect(fuera.principal).toEqual({
      tipo: 'elegir-lead',
      clave: 'vincular-lead',
      etiqueta: 'Vincular a un lead',
    })
    expect(etiquetas(fuera.resto)).toEqual(['Marcar un interesado'])
  })

  it('en un resumen o en logística, las mismas como enlaces a la ficha con su panel', () => {
    for (const lugar of ['resumen', 'logistica'] as const) {
      const fuera = accionesFueraDeLosGrupos(vacios(), contexto(ANCLA_V, { lugar }))
      expect(fuera.principal).toMatchObject({
        tipo: 'enlace',
        href: `/vehiculos/${VEHICULO}?panel=vincular-lead`,
      })
      expect(fuera.resto).toEqual([
        expect.objectContaining({
          tipo: 'enlace',
          href: `/vehiculos/${VEHICULO}?panel=marcar-interesado`,
        }),
      ])
    }
  })

  it('todo vacío sin editar el vehículo: marcar a la vista y nada más', () => {
    const fuera = accionesFueraDeLosGrupos(vacios(), contexto({ ...ANCLA_V, editable: false }))
    expect(fuera.principal?.etiqueta).toBe('Marcar un interesado')
    expect(fuera.resto).toEqual([])
  })

  it('todo vacío sin `leads.editar`: nada (todo vacío no ofrece «Cotizar»)', () => {
    const fuera = accionesFueraDeLosGrupos(
      vacios(),
      contexto(ANCLA_V, { para: { ...PARA, editarLeads: false } }),
    )
    expect(fuera).toEqual({ principal: null, resto: [] })
  })

  it('con interesados y sin vínculo ni cotizaciones: vincular y cotizar; marcar vive en su grupo', () => {
    const fuera = accionesFueraDeLosGrupos(
      { ...vacios(), interesado: grupo('interesado', 2) },
      contexto(ANCLA_V),
    )
    expect(fuera.principal).toBeNull()
    expect(etiquetas(fuera.resto)).toEqual(['Vincular a un lead', 'Cotizar'])
  })

  it('un vínculo que no se ve no está afuera: «Desvincular» queda en su grupo', () => {
    const fuera = accionesFueraDeLosGrupos(
      { vinculado: grupo('vinculado', 0, 1), interesado: grupo('interesado', 1), cotizado: null },
      contexto(ANCLA_V),
    )
    expect(fuera.resto).toEqual([])
  })

  it('sin `cotizaciones.ver` (Cotizado null) no ofrece «Cotizar» por ese grupo', () => {
    const fuera = accionesFueraDeLosGrupos(
      { vinculado: grupo('vinculado', 1), interesado: grupo('interesado'), cotizado: null },
      contexto(ANCLA_V, { para: { ...PARA, editarLeads: false } }),
    )
    expect(fuera.resto).toEqual([])
  })
})

describe('accionesFueraDeLosGrupos desde un lead', () => {
  it('sin vínculo y con interesados: «Vincular o marcar un vehículo» sólo con su cartera', () => {
    const grupos = { ...vacios(), interesado: grupo('interesado', 1) }
    expect(etiquetas(accionesFueraDeLosGrupos(grupos, contexto(ANCLA_L)).resto)).toEqual([
      'Vincular o marcar un vehículo',
    ])
    expect(
      accionesFueraDeLosGrupos(grupos, contexto({ ...ANCLA_L, puedoActuar: false })).resto,
    ).toEqual([])
  })

  it('todo vacío: el enlace a la vista y nada en el «⋯»', () => {
    const fuera = accionesFueraDeLosGrupos(vacios(), contexto(ANCLA_L))
    expect(fuera.principal).toMatchObject({
      tipo: 'enlace',
      etiqueta: 'Vincular o marcar un vehículo',
    })
    expect(fuera.resto).toEqual([])
  })
})
