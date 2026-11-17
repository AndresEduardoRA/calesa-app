// Lo que quien mira puede hacer sobre lo que falta de una unidad, resuelto en el servidor con `puede()` sobre sus permisos (la action de «Qué falta»): la regla
// de las acciones recibe booleanos y nunca los permisos, que no viajan al navegador. Las claves por origen se miran en el de la unidad; las globales
// (`logistica.pagos.confirmar`, `repuestos.*`, `agenda.tareas.asignar`) en cualquiera. Puro, sin I/O.
import { puede, type Permisos } from '@/shared/lib/permisos'

/** Los huecos del panel a los que lleva una acción de «Qué falta» (claves de `ORDEN_DE_HUECOS`). */
export const HUECOS_DE_ACCION = [
  'documentos',
  'transporte',
  'aduana',
  'pagos',
  'repuestos',
] as const

export type HuecoDeAccion = (typeof HUECOS_DE_ACCION)[number]

export type CapacidadesDeQueFalta = {
  tipo: 'vehiculo' | 'repuesto'
  // Documentos de la unidad: `logistica.documentos.*` del origen (vehículo) o `repuestos.documentos.*` (ítem).
  subirDocumentos: boolean
  aprobarDocumentos: boolean
  editarTransporte: boolean
  gestionarAduana: boolean
  verPagos: boolean
  editarPagos: boolean
  confirmarPagos: boolean
  editarVehiculo: boolean
  editarLeads: boolean
  gestionarFinal: boolean
  verCotizaciones: boolean
  verRepuestos: boolean
  moverRepuestos: boolean
  editarRepuestos: boolean
  editarCostosDeRepuestos: boolean
  // `logistica.ver` en algún origen: «Ir al vehículo» de un ítem que espera a su vehículo.
  verLogistica: boolean
  asignarTareas: boolean
  // Si quien mira tiene la clave de ese hueco (sin mirar la regla del flujo): con ella y sin el hueco dibujado, la regla está apagada.
  veHueco: Record<HuecoDeAccion, boolean>
}

export type UnidadDeLasCapacidades = { tipo: 'vehiculo' | 'repuesto'; origenId: string | null }

/** Las capacidades de quien mira sobre esa unidad. Un ítem no tiene origen: sólo cuentan sus claves globales. */
export function capacidadesDeQueFalta(
  permisos: Permisos,
  { tipo, origenId }: UnidadDeLasCapacidades,
): CapacidadesDeQueFalta {
  const global = (clave: Parameters<typeof puede>[1]) => puede(permisos, clave)
  const verRepuestos = global('repuestos.ver')
  if (tipo === 'repuesto' || origenId === null) {
    return {
      tipo: 'repuesto',
      subirDocumentos: global('repuestos.documentos.subir'),
      aprobarDocumentos: global('repuestos.documentos.aprobar'),
      editarTransporte: false,
      gestionarAduana: false,
      verPagos: false,
      editarPagos: false,
      confirmarPagos: false,
      editarVehiculo: false,
      editarLeads: false,
      gestionarFinal: false,
      verCotizaciones: false,
      verRepuestos,
      moverRepuestos: global('repuestos.mover'),
      editarRepuestos: global('repuestos.editar'),
      editarCostosDeRepuestos: global('repuestos.costos.editar'),
      verLogistica: global('logistica.ver'),
      asignarTareas: global('agenda.tareas.asignar'),
      veHueco: {
        documentos: verRepuestos,
        transporte: false,
        aduana: false,
        pagos: false,
        repuestos: false,
      },
    }
  }
  const delOrigen = (clave: Parameters<typeof puede>[1]) => puede(permisos, clave, origenId)
  const verLogistica = delOrigen('logistica.ver')
  return {
    tipo: 'vehiculo',
    subirDocumentos: delOrigen('logistica.documentos.subir'),
    aprobarDocumentos: delOrigen('logistica.documentos.aprobar'),
    editarTransporte: delOrigen('logistica.transporte.editar'),
    gestionarAduana: delOrigen('logistica.aduana.gestionar'),
    verPagos: delOrigen('logistica.pagos.ver'),
    editarPagos: delOrigen('logistica.pagos.editar'),
    confirmarPagos: global('logistica.pagos.confirmar'),
    editarVehiculo: delOrigen('vehiculos.editar'),
    editarLeads: delOrigen('leads.editar'),
    gestionarFinal: delOrigen('cotizaciones.final.gestionar'),
    verCotizaciones: delOrigen('cotizaciones.ver'),
    verRepuestos,
    moverRepuestos: global('repuestos.mover'),
    editarRepuestos: global('repuestos.editar'),
    editarCostosDeRepuestos: global('repuestos.costos.editar'),
    verLogistica,
    asignarTareas: global('agenda.tareas.asignar'),
    veHueco: {
      documentos: verLogistica,
      transporte: verLogistica,
      aduana: verLogistica,
      pagos: delOrigen('logistica.pagos.ver'),
      repuestos: verRepuestos,
    },
  }
}
