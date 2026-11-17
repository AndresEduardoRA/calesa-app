// Qué destraba un requisito de dato, por el prefijo de su clave (`detalle.clave_dato`): transporte y aduana en su hueco, pagos en «Pagos», los datos del vehículo
// en su ficha y los de un ítem en su proyecto. Una clave desconocida no ofrece nada. Puro, sin I/O.
import { RUTAS } from '@/shared/lib/rutas'
import {
  alHueco,
  alProyecto,
  ir,
  registrarPago,
  type PlanDelRequisito,
  type RequisitoQueFalta,
} from './accion-de-requisito'
import type { CapacidadesDeQueFalta } from './capacidades-de-que-falta'

const fichaDelVehiculo = (id: string, consulta: string) =>
  `${RUTAS.vehiculos}/${encodeURIComponent(id)}?${consulta}`

export function claveDeDato(r: Pick<RequisitoQueFalta, 'detalle'>): string | null {
  const clave = r.detalle['clave_dato']
  return typeof clave === 'string' && clave !== '' ? clave : null
}

function planDePagos(r: RequisitoQueFalta, c: CapacidadesDeQueFalta): PlanDelRequisito {
  const irAPagos = alHueco('pagos', r.etiqueta)
  if (!c.verPagos)
    return { hacer: null, pedir: 'logistica.pagos.confirmar', extras: [], hueco: 'pagos' }
  if (c.editarPagos) {
    return {
      hacer: registrarPago(r.etiqueta),
      pedir: null,
      extras: [c.confirmarPagos && irAPagos],
      hueco: 'pagos',
    }
  }
  if (c.confirmarPagos) return { hacer: irAPagos, pedir: null, extras: [], hueco: 'pagos' }
  return { hacer: null, pedir: 'logistica.pagos.confirmar', extras: [irAPagos], hueco: 'pagos' }
}

function planDelVehiculo(
  r: RequisitoQueFalta,
  clave: string,
  c: CapacidadesDeQueFalta,
  vehiculoId: string,
): PlanDelRequisito | null {
  if (clave === 'vehiculo.vin') {
    const hacer = c.editarVehiculo
      ? ir(
          'Completar',
          `Completar «${r.etiqueta}»`,
          fichaDelVehiculo(vehiculoId, `editar=${encodeURIComponent(vehiculoId)}`),
        )
      : null
    return { hacer, pedir: 'vehiculos.editar', extras: [], hueco: null }
  }
  if (clave === 'vehiculo.lead') {
    const hacer =
      c.editarVehiculo && c.editarLeads
        ? ir(
            'Vincular',
            `Vincular «${r.etiqueta}»`,
            fichaDelVehiculo(vehiculoId, 'panel=vincular-lead'),
          )
        : null
    return { hacer, pedir: 'vehiculos.editar', extras: [], hueco: null }
  }
  if (clave === 'vehiculo.cotizacion_final') {
    const irACotizaciones = ir(
      'Ir a Cotizaciones',
      `Ir a Cotizaciones por «${r.etiqueta}»`,
      fichaDelVehiculo(vehiculoId, 'seccion=cotizaciones'),
    )
    return c.gestionarFinal
      ? { hacer: irACotizaciones, pedir: null, extras: [], hueco: null }
      : {
          hacer: null,
          pedir: 'cotizaciones.final.gestionar',
          extras: [c.verCotizaciones && irACotizaciones],
          hueco: null,
        }
  }
  return null
}

function planDelItem(
  r: RequisitoQueFalta,
  clave: string,
  c: CapacidadesDeQueFalta,
): PlanDelRequisito | null {
  if (clave === 'repuesto.tracking') {
    return {
      hacer: c.editarRepuestos ? alProyecto(r.etiqueta, null) : null,
      pedir: 'repuestos.editar',
      extras: [],
      hueco: null,
    }
  }
  if (clave === 'repuesto.precio' || clave === 'proyecto.pago_cliente') {
    const pestana = clave === 'proyecto.pago_cliente' ? 'pagos' : null
    return {
      hacer: c.editarCostosDeRepuestos ? alProyecto(r.etiqueta, pestana) : null,
      pedir: 'repuestos.costos.editar',
      extras: [],
      hueco: null,
    }
  }
  return null
}

function planDeUnHueco(
  r: RequisitoQueFalta,
  clave: string,
  c: CapacidadesDeQueFalta,
): PlanDelRequisito | null {
  const prefijo = clave.split('.')[0]
  if (prefijo === 'transporte') {
    const irATransporte = alHueco('transporte', r.etiqueta)
    return c.editarTransporte
      ? {
          hacer: alHueco('transporte', r.etiqueta, clave),
          pedir: null,
          extras: [],
          hueco: 'transporte',
        }
      : {
          hacer: null,
          pedir: 'logistica.transporte.editar',
          extras: [irATransporte],
          hueco: 'transporte',
        }
  }
  if (prefijo === 'aduana') {
    const irAAduana = alHueco('aduana', r.etiqueta)
    return c.gestionarAduana
      ? { hacer: irAAduana, pedir: null, extras: [], hueco: 'aduana' }
      : { hacer: null, pedir: 'logistica.aduana.gestionar', extras: [irAAduana], hueco: 'aduana' }
  }
  return prefijo === 'pagos' ? planDePagos(r, c) : null
}

/** El plan de un requisito de dato, o nulo si su clave no se conoce. */
export function planDeUnDato(
  r: RequisitoQueFalta,
  c: CapacidadesDeQueFalta,
  unidadId: string,
): PlanDelRequisito | null {
  const clave = claveDeDato(r)
  if (clave === null) return null
  if (c.tipo === 'repuesto') return planDelItem(r, clave, c)
  return planDeUnHueco(r, clave, c) ?? planDelVehiculo(r, clave, c, unidadId)
}
