// Lo que «Nuevo» (la barra superior) puede ofrecer y a dónde lleva cada cosa. Datos puros, sin permisos: el servidor decide qué claves ve cada persona
// (`opciones.ts`) y sólo esas claves cruzan al navegador; este archivo viaja con el modal (diferido), no con el documento de cada pantalla.
import { RUTAS } from '@/shared/lib/rutas'

export const CLAVES_DE_NUEVO = [
  'lead',
  'vehiculo',
  // Quien sólo da de alta vehículos desde la hoja de cotizar: lo que hace hoy «Nuevo» apagado en el inventario.
  'vehiculo-al-cotizar',
  'cotizacion',
  'proyecto',
  'seguimiento',
  'recordatorio',
  'evento',
  'tarea',
] as const

export type ClaveDeNuevo = (typeof CLAVES_DE_NUEVO)[number]

export type DestinoDeNuevo =
  // El drawer `?panel=nuevo-lead` en la pantalla de ahora (no navega).
  | { tipo: 'drawer-de-lead' }
  | { tipo: 'ruta'; ruta: string }
  // Un segundo paso dentro del modal: elegir el lead de la cartera y, con él, ir a su ficha.
  | { tipo: 'elegir-lead'; accion: 'anotar-seguimiento' | 'agendar-recordatorio' }

export type OpcionDeNuevo = {
  clave: ClaveDeNuevo
  titulo: string
  descripcion: string
  destino: DestinoDeNuevo
}

export const CATALOGO_DE_NUEVO: Record<ClaveDeNuevo, OpcionDeNuevo> = {
  lead: {
    clave: 'lead',
    titulo: 'Lead',
    descripcion: 'Registrar a una persona que quiere comprar.',
    destino: { tipo: 'drawer-de-lead' },
  },
  vehiculo: {
    clave: 'vehiculo',
    titulo: 'Vehículo',
    descripcion: 'Dar de alta un vehículo en el inventario.',
    destino: { tipo: 'ruta', ruta: RUTAS.nuevoVehiculo },
  },
  'vehiculo-al-cotizar': {
    clave: 'vehiculo-al-cotizar',
    titulo: 'Vehículo',
    descripcion: 'Tu rol lo da de alta al cotizar: abre la hoja con el vehículo nuevo.',
    destino: {
      tipo: 'ruta',
      ruta: `${RUTAS.nuevaCotizacion}?panel=vehiculo&alta=mano`,
    },
  },
  cotizacion: {
    clave: 'cotizacion',
    titulo: 'Cotización',
    descripcion: 'Cotizar un vehículo para un cliente.',
    destino: { tipo: 'ruta', ruta: RUTAS.nuevaCotizacion },
  },
  proyecto: {
    clave: 'proyecto',
    titulo: 'Proyecto de repuestos',
    descripcion: 'Abrir un proyecto de repuestos de un vehículo o externo.',
    destino: { tipo: 'ruta', ruta: `${RUTAS.repuestos}?panel=nuevo-proyecto` },
  },
  seguimiento: {
    clave: 'seguimiento',
    titulo: 'Seguimiento',
    descripcion: 'Anotar un seguimiento a uno de tus leads.',
    destino: { tipo: 'elegir-lead', accion: 'anotar-seguimiento' },
  },
  recordatorio: {
    clave: 'recordatorio',
    titulo: 'Recordatorio',
    descripcion: 'Agendar un recordatorio sobre uno de tus leads.',
    destino: { tipo: 'elegir-lead', accion: 'agendar-recordatorio' },
  },
  evento: {
    clave: 'evento',
    titulo: 'Evento',
    descripcion: 'Poner un evento en la agenda.',
    destino: { tipo: 'ruta', ruta: '/agenda?panel=nuevo-evento' },
  },
  tarea: {
    clave: 'tarea',
    titulo: 'Tarea',
    descripcion: 'Crear una tarea con responsable.',
    destino: { tipo: 'ruta', ruta: '/agenda?panel=nueva-tarea' },
  },
}
