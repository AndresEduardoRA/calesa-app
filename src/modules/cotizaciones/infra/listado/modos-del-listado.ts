import 'server-only'
import { z } from 'zod'
import { MAXIMO_DE_PAGINA_DE_COTIZACIONES } from '../../entities/listado/listado'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'

const esquemaDeIds = z.array(z.guid()).max(MAXIMO_DE_PAGINA_DE_COTIZACIONES)
const esquemaDeFilas = z.array(z.object({ id: z.guid(), modo: z.string() }))

// El nombre del modo de tipo de cambio de las cotizaciones de una página (el «Total» de la tarjeta de la lista lo dice al lado): UNA llamada a
// `cotizaciones_modos_de()` (invocadora, por `cotizaciones_pkey`, `_nombre_del_modo()` una vez por versión y modo). Sin ids no consulta; una sin modo no llega.
export async function getModosDeCotizaciones(
  ids: readonly string[],
): Promise<Resultado<Map<string, string>>> {
  const validos = esquemaDeIds.safeParse(ids)
  if (!validos.success) {
    return fallo('validacion', 'Esas cotizaciones no son válidas.')
  }
  if (validos.data.length === 0) {
    return ok(new Map())
  }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('cotizaciones_modos_de', { p_ids: validos.data })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = esquemaDeFilas.safeParse(data)
  if (!filas.success) {
    return fallo('inesperado', 'No pudimos leer el modo de las cotizaciones.')
  }
  return ok(new Map(filas.data.map((fila) => [fila.id, fila.modo])))
}
