import type { AsesorDeLaTarjeta } from '@/modules/cotizaciones'
import { vehiculoDeLaTarjeta } from '../datos-de-la-tarjeta'

// El título del vehículo elegido para la banda de la tarjeta (4.18-2); sin vehículo, nulo.
export function tituloDelElegido(elegido: { vehiculo: { titulo: string } } | null) {
  return elegido?.vehiculo.titulo ?? null
}

// Lo que la tarjeta de la hoja nueva nombra: el vehículo elegido (con lote y VIN), quien cotiza y el cliente, si quien mira los ve. El título no: la tarjeta lee el
// que se está escribiendo.
export function tarjetaDeLaHojaNueva({
  elegido,
  cliente,
  asesor,
}: {
  elegido: { vehiculo: { titulo: string; lote: string | null; vin: string | null } } | null
  cliente: { nombre: string } | null
  asesor: AsesorDeLaTarjeta
}) {
  return {
    vehiculo: vehiculoDeLaTarjeta(elegido === null ? null : elegido.vehiculo),
    asesor,
    cliente: cliente === null ? null : cliente.nombre,
  }
}
