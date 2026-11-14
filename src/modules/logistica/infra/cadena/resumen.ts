import 'server-only'
import { errorDePostgrest } from '@/shared/lib/errores'
import { TOPE_DEL_CONTEO } from '@/shared/lib/conteo'
import { createClient } from '@/shared/lib/supabase/server'
import { resumenDesde } from '../../entities/cadena/resumen'
import type { LectorDelResumen } from '../../entities/cadena/repositorios'

// El número de cada fase se lee con `logistica_cadena_resumen()` (conteo con tope por `vehiculos_cadena_idx`: `TOPE_DEL_CONTEO` + 1 claves por número, nunca un total) con la sesión de
// quien mira: la base decide el acceso (`logistica.ver` y `vehiculos.ver` del origen; sin él, 42501). La respuesta es `Json`: la entidad la valida.
export const leerResumenDeLaBase: LectorDelResumen = async (origenId) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('logistica_cadena_resumen', {
    p_origen: origenId,
    p_tope: TOPE_DEL_CONTEO,
  })
  if (error) return { ok: false, error: errorDePostgrest(error) }
  return resumenDesde(data)
}
