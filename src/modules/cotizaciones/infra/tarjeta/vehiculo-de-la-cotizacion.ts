import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'

const esquema = z.array(z.object({ vehiculo_id: z.guid().nullable() }))

// El vehículo de una cotización guardada, para las fotos de «Compartir la cotización»: una lectura por clave primaria (`cotizaciones_pkey`, `limit(1)`) como quien
// mira (la RLS decide), sin la de la papelera. Sin fila (no existe, está en la papelera o no se ve) o sin vehículo, nulo.
export async function getVehiculoDeLaCotizacion(id: string): Promise<Resultado<string | null>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cotizaciones')
    .select('vehiculo_id')
    .eq('id', id)
    .is('eliminado_en', null)
    .limit(1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = esquema.safeParse(data)
  if (!filas.success) {
    return fallo('inesperado', 'No pudimos leer el vehículo de la cotización.')
  }
  return ok(filas.data[0]?.vehiculo_id ?? null)
}
