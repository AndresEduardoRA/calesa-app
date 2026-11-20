// Una fila de «De este vehículo» como la tarjeta de la ficha del vehículo. Nada de React ni de Supabase.
import type { DatosDeLaTarjeta } from '../tarjetas-de-la-ficha'
import type { FilaDeEsteVehiculo } from './de-este-vehiculo'

// Una fila de «De este vehículo» como tarjeta: sin cliente, con el título del vehículo (el que muestra cuando la cotización no tiene el suyo).
export function tarjetaDeEsteVehiculo(
  fila: FilaDeEsteVehiculo,
  tituloDelVehiculo: string | null,
): DatosDeLaTarjeta {
  return {
    id: fila.id,
    numero: fila.numero,
    titulo: fila.titulo,
    vehiculo: tituloDelVehiculo,
    clase: fila.clase,
    aprobada: fila.aprobada,
    totalBase: fila.totalBase,
    modo: fila.modo,
    autor: fila.autor,
    creadoEn: fila.creadoEn,
    venceEl: fila.venceEl,
    vencida: fila.vencida,
    cliente: null,
    leadId: null,
    privada: fila.privada,
  }
}
