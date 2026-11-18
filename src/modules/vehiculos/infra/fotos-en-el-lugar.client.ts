// Las fotos de un vehículo donde se nombra (`FotosEnElLugar`: fila, tarjeta, ficha, hoja de cotizar), en el navegador y con la sesión de quien
// mira: la RLS decide qué llega (lo que no ve, lo que está en la papelera y lo que no existe vuelven vacío). Se piden al acercarse al carrusel,
// sin pedirle otra página al servidor.
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { COLUMNAS_DE_FOTO, MAXIMO_DE_FOTOS, fotosDesde } from '../entities/foto'
import type { LectorDeFotos } from '../entities/repositorios'

// Las fotos de un vehículo, en su orden (a lo sumo 24: `vehiculos_imagenes` por `vehiculo_id`). Sólo la lista: el carrusel no las edita,
// así que no hace falta la versión.
export const leerFotosEnElLugar: LectorDeFotos = async (vehiculoId) => {
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
