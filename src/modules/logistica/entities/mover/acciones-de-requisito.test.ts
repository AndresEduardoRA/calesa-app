import { describe, expect, it } from 'vitest'
import { MAXIMO_EN_MAS, type AccionDeRequisito } from './accion-de-requisito'
import { resolverAccionesDeQueFalta } from './acciones-de-requisito'
import { capacidades, documento, espera, TIPO_BL, VEHICULO } from './acciones-de-requisito.soporte'
import type { CapacidadesDeQueFalta } from './capacidades-de-que-falta'
import { PEDIDO_A_ADMIN } from './pedido-de-requisito'
import type { RequisitoQueFalta } from './accion-de-requisito'

const FASE = 'Embarcado'

function resolver(
  r: RequisitoQueFalta,
  c: CapacidadesDeQueFalta,
  unidad: { tipo: 'vehiculo' | 'repuesto'; id: string } = { tipo: 'vehiculo', id: VEHICULO },
) {
  return resolverAccionesDeQueFalta([{ nombre: FASE, requisitos: [r] }], {
    unidad,
    capacidades: c,
  })[r.requisitoId]
}

const tipos = (lista: readonly AccionDeRequisito[]) => lista.map((a) => a.tipo)

describe('acciones de un documento que falta', () => {
  it('sin subir y quien sube: «Subir» con su tipo y, en el «⋯», «Ir a Documentos»', () => {
    const a = resolver(documento(), capacidades({ subirDocumentos: true }))
    expect(a?.principal).toEqual({
      tipo: 'subir',
      tipoDocumentoId: TIPO_BL,
      etiqueta: 'Subir',
      nombre: 'Subir «BL»',
    })
    expect(tipos(a?.mas ?? [])).toEqual(['hueco'])
    expect(a?.pedido).toBeNull()
    expect(a?.hueco).toBe('documentos')
    expect(a?.veElHueco).toBe(true)
  })

  it('sin subir, quien no sube y da tareas: «Pedirlo» a quien sube, con el título de la tarea', () => {
    const a = resolver(documento(), capacidades({ asignarTareas: true }))
    expect(a?.principal).toEqual({
      tipo: 'pedir',
      clave: 'logistica.documentos.subir',
      titulo: 'Falta: BL aprobado para pasar a «Embarcado»',
      etiqueta: 'Pedirlo',
      nombre: 'Pedirlo: «BL»',
    })
    expect(tipos(a?.mas ?? [])).toEqual(['hueco'])
    expect(a?.pedido).toBeNull()
  })

  it('sin subir y sin dar tareas: «Ir a Documentos» y el pedido a administración como nota', () => {
    const a = resolver(documento(), capacidades())
    expect(a?.principal?.tipo).toBe('hueco')
    expect(a?.mas).toEqual([])
    expect(a?.pedido).toBe(PEDIDO_A_ADMIN)
  })

  it('con uno por revisar y quien aprueba: «Revisar» y, si sube, «Subir» en el «⋯»', () => {
    const r = documento({ por_revisar: 1 })
    const a = resolver(r, capacidades({ aprobarDocumentos: true, subirDocumentos: true }))
    expect(a?.principal?.tipo).toBe('revisar')
    expect(a?.principal?.nombre).toBe('Revisar «BL»')
    expect(tipos(a?.mas ?? [])).toEqual(['subir'])
    // Sin subir, «Ir a Documentos» no se repite: «Revisar» ya lleva ahí.
    expect(resolver(r, capacidades({ aprobarDocumentos: true }))?.mas).toEqual([])
  })

  it('con uno por revisar y quien sólo sube: «Pedirlo» a quien aprueba con «Subir» en el «⋯»', () => {
    const a = resolver(
      documento({ por_revisar: 2 }),
      capacidades({ subirDocumentos: true, asignarTareas: true }),
    )
    expect(a?.principal).toMatchObject({ tipo: 'pedir', clave: 'logistica.documentos.aprobar' })
    expect(tipos(a?.mas ?? [])).toEqual(['subir'])
  })

  it('con más aprobados que el máximo: «Ir a Documentos» o, sin claves, pedírselo a quien aprueba', () => {
    const r = documento({ aprobados: 3, max: 2 })
    expect(resolver(r, capacidades({ subirDocumentos: true }))?.principal).toMatchObject({
      tipo: 'hueco',
      hueco: 'documentos',
      etiqueta: 'Ir a Documentos',
    })
    expect(resolver(r, capacidades({ asignarTareas: true }))?.principal).toMatchObject({
      tipo: 'pedir',
      clave: 'logistica.documentos.aprobar',
    })
  })

  it('de un ítem: sus claves de repuestos y nunca «Pedirlo»', () => {
    const item = { tipo: 'repuesto' as const, id: 'i' }
    const c = capacidades({ tipo: 'repuesto', asignarTareas: true })
    const sinClave = resolver(documento(), c, item)
    expect(sinClave?.principal?.tipo).toBe('hueco')
    expect(sinClave?.pedido).toBe(PEDIDO_A_ADMIN)
    expect(resolver(documento(), { ...c, subirDocumentos: true }, item)?.principal?.tipo).toBe(
      'subir',
    )
  })
})

describe('acciones de una espera', () => {
  const hijos = espera({ hijos: 2, llegaron: 1, sin_llegar: 0 })

  it('el vehículo espera a sus ítems: con ver y mover repuestos, «Ir a Repuestos»', () => {
    const a = resolver(hijos, capacidades({ verRepuestos: true, moverRepuestos: true }))
    expect(a?.principal).toMatchObject({
      tipo: 'hueco',
      hueco: 'repuestos',
      etiqueta: 'Ir a Repuestos',
    })
    expect(a?.hueco).toBe('repuestos')
  })

  it('con ver y sin mover: «Pedirlo» a quien mueve, con «Ir a Repuestos»; sin ver, sólo «Pedirlo»', () => {
    const conVer = resolver(hijos, capacidades({ verRepuestos: true, asignarTareas: true }))
    expect(conVer?.principal).toMatchObject({ tipo: 'pedir', clave: 'repuestos.mover' })
    expect(tipos(conVer?.mas ?? [])).toEqual(['hueco'])
    const sinVer = resolver(hijos, capacidades({ asignarTareas: true }))
    expect(sinVer?.principal).toMatchObject({ tipo: 'pedir' })
    expect(sinVer?.mas).toEqual([])
  })

  it('el ítem espera a su vehículo: «Ir al vehículo» con logística; sin ella, nada', () => {
    const padre = espera({ padre: VEHICULO })
    const item = { tipo: 'repuesto' as const, id: 'i' }
    expect(resolver(padre, capacidades({ tipo: 'repuesto' }), item)?.principal).toMatchObject({
      tipo: 'ir',
      ruta: `/logistica/vehiculo/${VEHICULO}`,
      etiqueta: 'Ir al vehículo',
    })
    const sin = resolver(padre, capacidades({ tipo: 'repuesto', verLogistica: false }), item)
    expect(sin?.principal).toBeNull()
    expect(sin?.pedido).toBeNull()
  })
})

describe('resolver «Qué falta»', () => {
  it('un requisito cumplido no trae nada', () => {
    const r = { ...documento(), cumplido: true }
    expect(resolver(r, capacidades({ subirDocumentos: true }))).toBeUndefined()
  })

  it('el «⋯» nunca trae más de dos', () => {
    const a = resolver(
      documento({ por_revisar: 1 }),
      capacidades({ aprobarDocumentos: true, subirDocumentos: true }),
    )
    expect(a?.mas.length).toBeLessThanOrEqual(MAXIMO_EN_MAS)
  })

  it('el título de la tarea nombra la fase de cada destino', () => {
    const r = documento()
    const otro = { ...documento(), requisitoId: 'r-otro' }
    const acciones = resolverAccionesDeQueFalta(
      [
        { nombre: 'Embarcado', requisitos: [r] },
        { nombre: 'En aduana', requisitos: [otro] },
      ],
      {
        unidad: { tipo: 'vehiculo', id: VEHICULO },
        capacidades: capacidades({ asignarTareas: true }),
      },
    )
    expect(acciones['r-otro']?.principal).toMatchObject({
      titulo: 'Falta: BL aprobado para pasar a «En aduana»',
    })
  })
})
