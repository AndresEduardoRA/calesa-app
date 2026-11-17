import { describe, expect, it } from 'vitest'
import type { RequisitoQueFalta } from './accion-de-requisito'
import { resolverAccionesDeQueFalta } from './acciones-de-requisito'
import { capacidades, dato, VEHICULO } from './acciones-de-requisito.soporte'
import { claveDeDato } from './acciones-de-un-dato'
import type { CapacidadesDeQueFalta } from './capacidades-de-que-falta'
import { PEDIDO_A_ADMIN } from './pedido-de-requisito'

function resolver(
  r: RequisitoQueFalta,
  c: CapacidadesDeQueFalta,
  tipo: 'vehiculo' | 'repuesto' = 'vehiculo',
) {
  return resolverAccionesDeQueFalta([{ nombre: 'Embarcado', requisitos: [r] }], {
    unidad: { tipo, id: tipo === 'vehiculo' ? VEHICULO : 'i' },
    capacidades: c,
  })[r.requisitoId]
}

describe('acciones de un dato que falta', () => {
  it('la clave sale del detalle; sin ella, nula', () => {
    expect(claveDeDato(dato('transporte.contenedor'))).toBe('transporte.contenedor')
    expect(claveDeDato({ detalle: {} })).toBeNull()
  })

  it('transporte: quien edita «Completar» con foco en el campo; si no, «Pedirlo» con «Ir a Transporte»', () => {
    const r = dato('transporte.contenedor', 'Contenedor')
    expect(resolver(r, capacidades({ editarTransporte: true }))?.principal).toEqual({
      tipo: 'hueco',
      hueco: 'transporte',
      enfocar: 'transporte.contenedor',
      etiqueta: 'Completar',
      nombre: 'Completar «Contenedor»',
    })
    const pide = resolver(r, capacidades({ asignarTareas: true }))
    expect(pide?.principal).toMatchObject({ tipo: 'pedir', clave: 'logistica.transporte.editar' })
    expect(pide?.mas).toMatchObject([
      { tipo: 'hueco', hueco: 'transporte', etiqueta: 'Ir a Transporte' },
    ])
    expect(pide?.hueco).toBe('transporte')
  })

  it('aduana: «Ir a Aduana» con la clave; si no, «Pedirlo» con «Ir a Aduana»', () => {
    const r = dato('aduana.canal', 'Canal de aduana')
    expect(resolver(r, capacidades({ gestionarAduana: true }))?.principal).toMatchObject({
      tipo: 'hueco',
      hueco: 'aduana',
      etiqueta: 'Ir a Aduana',
    })
    const pide = resolver(r, capacidades({ asignarTareas: true }))
    expect(pide?.principal).toMatchObject({ clave: 'logistica.aduana.gestionar' })
    expect(pide?.mas).toHaveLength(1)
  })
})

describe('acciones de un dato del vehículo o del ítem', () => {
  it('VIN: «Completar» en la ficha del vehículo con su edición abierta', () => {
    const r = dato('vehiculo.vin', 'VIN del vehículo')
    expect(resolver(r, capacidades({ editarVehiculo: true }))?.principal).toEqual({
      tipo: 'ir',
      ruta: `/vehiculos/${VEHICULO}?editar=${VEHICULO}`,
      etiqueta: 'Completar',
      nombre: 'Completar «VIN del vehículo»',
    })
    expect(resolver(r, capacidades({ asignarTareas: true }))?.principal).toMatchObject({
      clave: 'vehiculos.editar',
    })
  })

  it('cliente: «Vincular» pide editar el vehículo y los leads', () => {
    const r = dato('vehiculo.lead', 'Cliente del vehículo')
    const ambos = capacidades({ editarVehiculo: true, editarLeads: true })
    expect(resolver(r, ambos)?.principal).toMatchObject({
      tipo: 'ir',
      ruta: `/vehiculos/${VEHICULO}?panel=vincular-lead`,
      etiqueta: 'Vincular',
    })
    expect(resolver(r, capacidades({ editarVehiculo: true }))?.principal).toBeNull()
  })

  it('cotización final: «Ir a Cotizaciones» con la clave; si no, «Pedirlo» y, con ver, el enlace', () => {
    const r = dato('vehiculo.cotizacion_final', 'Cotización final')
    expect(resolver(r, capacidades({ gestionarFinal: true }))?.principal).toMatchObject({
      ruta: `/vehiculos/${VEHICULO}?seccion=cotizaciones`,
    })
    const pide = resolver(r, capacidades({ asignarTareas: true, verCotizaciones: true }))
    expect(pide?.principal).toMatchObject({ clave: 'cotizaciones.final.gestionar' })
    expect(pide?.mas).toMatchObject([{ tipo: 'ir', etiqueta: 'Ir a Cotizaciones' }])
    expect(resolver(r, capacidades({ asignarTareas: true }))?.mas).toEqual([])
  })

  it('datos de un ítem: «Ir al proyecto» con su clave (pagos en su pestaña); si no, el pedido', () => {
    const item = capacidades({ tipo: 'repuesto', asignarTareas: true })
    expect(
      resolver(dato('repuesto.tracking'), { ...item, editarRepuestos: true }, 'repuesto')
        ?.principal,
    ).toMatchObject({ tipo: 'proyecto', pestana: null })
    expect(
      resolver(
        dato('proyecto.pago_cliente'),
        { ...item, editarCostosDeRepuestos: true },
        'repuesto',
      )?.principal,
    ).toMatchObject({ tipo: 'proyecto', pestana: 'pagos' })
    const sin = resolver(dato('repuesto.precio'), item, 'repuesto')
    expect(sin?.principal).toBeNull()
    expect(sin?.pedido).toBe(PEDIDO_A_ADMIN)
  })

  it('una clave desconocida no ofrece nada', () => {
    expect(resolver(dato('otra.cosa'), capacidades({ asignarTareas: true }))).toBeUndefined()
  })
})

describe('acciones de un pago que falta', () => {
  const r = dato('pagos.confirmado', 'Pago confirmado')
  const ve = { verPagos: true, veHueco: { ...capacidades().veHueco, pagos: true } }

  it('quien edita registra y, si confirma, también va a «Pagos»', () => {
    const a = resolver(r, capacidades({ ...ve, editarPagos: true, confirmarPagos: true }))
    expect(a?.principal).toMatchObject({ tipo: 'registrar-pago', etiqueta: 'Registrar' })
    expect(a?.mas).toMatchObject([{ tipo: 'hueco', hueco: 'pagos' }])
    expect(resolver(r, capacidades({ ...ve, editarPagos: true }))?.mas).toEqual([])
  })

  it('quien sólo confirma: «Ir a Pagos»', () => {
    const a = resolver(r, capacidades({ ...ve, confirmarPagos: true }))
    expect(a?.principal).toMatchObject({ tipo: 'hueco', hueco: 'pagos' })
    expect(a?.pedido).toBeNull()
  })

  it('quien ve sin editar ni confirmar: «Pedirlo» a quien confirma con «Ir a Pagos»', () => {
    const a = resolver(r, capacidades({ ...ve, asignarTareas: true }))
    expect(a?.principal).toMatchObject({ tipo: 'pedir', clave: 'logistica.pagos.confirmar' })
    expect(a?.mas).toMatchObject([{ tipo: 'hueco', hueco: 'pagos' }])
    expect(a?.veElHueco).toBe(true)
  })

  it('quien no ve pagos: sólo «Pedirlo», o el pedido a administración', () => {
    const a = resolver(r, capacidades({ asignarTareas: true }))
    expect(a?.principal).toMatchObject({ tipo: 'pedir' })
    expect(a?.mas).toEqual([])
    expect(a?.veElHueco).toBe(false)
    const sin = resolver(r, capacidades())
    expect(sin?.principal).toBeNull()
    expect(sin?.pedido).toBe(PEDIDO_A_ADMIN)
  })
})
