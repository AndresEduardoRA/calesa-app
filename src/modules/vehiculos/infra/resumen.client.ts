// Lo que lee el resumen de un vehículo (`?vehiculo=`), en el navegador y con la sesión de quien mira: la RLS decide qué llega (lo que
// no ve, lo que está en la papelera y lo que no existe vuelven igual: nulo o vacío). Va por el navegador para poder releerlo al volver
// a la pestaña y para pedir las fotos y los interesados sólo al elegir su pestaña, sin pedirle otra página al servidor.
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { COLUMNAS_DE_FOTO, MAXIMO_DE_FOTOS, fotosDesde } from '../entities/foto'
import type { LectorDeFotos, LectorDeVehiculo } from '../entities/repositorios'
import { COLUMNAS_DE_VEHICULO, FILTRO_DE_PORTADA, vehiculosDesde } from '../entities/vehiculo'

// Un vehículo por su id con la miniatura de su portada: un pedido. Lo mismo que `getVehiculo()` del servidor.
export const leerVehiculoDelResumen: LectorDeVehiculo = async (id) => {
  const { data, error } = await createClient()
    .from('vehiculos')
    .select(COLUMNAS_DE_VEHICULO)
    .eq('id', id)
    .eq(FILTRO_DE_PORTADA.columna, FILTRO_DE_PORTADA.valor)
    .limit(1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(vehiculosDesde(data)[0] ?? null)
}

// Las fotos de un vehículo, en su orden (a lo sumo 24: `vehiculos_imagenes` por `vehiculo_id`). Sólo la lista: el resumen no las edita,
// así que no hace falta la versión.
export const leerFotosDelResumen: LectorDeFotos = async (vehiculoId) => {
  const { data, error } = await createClient()
    .from('vehiculos_imagenes')
    .select(COLUMNAS_DE_FOTO)
    .eq('vehiculo_id', vehiculoId)
    .order('orden')
    .limit(MAXIMO_DE_FOTOS)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(fotosDesde(data))
}
