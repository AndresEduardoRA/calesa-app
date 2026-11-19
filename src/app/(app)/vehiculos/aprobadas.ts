import { leerAprobadasDeVehiculos, rutaDeLaCotizacion } from '@/modules/cotizaciones'
import type { AprobadasDeLaPagina, Vehiculo } from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'

// La cotización aprobada de cada vehículo de la página (el «Costo estimado»), con la ruta de su cotización (`vehiculos` no conoce `cotizaciones`: lo une esta página). Sólo con
// `cotizaciones.ver` en algún origen: sin esa clave no se pregunta y la columna no se dibuja (`null`). Una lectura (la RPC `cotizaciones_aprobadas_de_vehiculos`, por la clave
// primaria de `cotizaciones_aprobadas` con los ids de la página, ≤ 100) que trae también el nombre del modo de cada una; la RLS deja sólo las de las cotizaciones que quien mira
// ve (la cotización puede ser de otro origen que el vehículo), y esas filas se dibujan «—». Si la lectura falla, `datosO`
// lanza: el error de la ruta con «Reintentar».
export async function aprobadasDeLaPagina(
  permisos: Permisos,
  filas: readonly Pick<Vehiculo, 'id'>[],
): Promise<AprobadasDeLaPagina | null> {
  if (!puede(permisos, 'cotizaciones.ver')) {
    return null
  }
  const leidas = datosO(await leerAprobadasDeVehiculos(filas.map((fila) => fila.id)))
  return Object.fromEntries(
    leidas.map((a) => [
      a.vehiculoId,
      {
        ruta: rutaDeLaCotizacion(a.cotizacionId),
        monto: a.monto,
        moneda: a.moneda,
        modo: a.modo,
      },
    ]),
  )
}
