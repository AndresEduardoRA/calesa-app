import 'server-only'
import { errorDePostgrest, fallo, MENSAJE_INESPERADO, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  COLUMNAS_DEL_LEAD_PARA_ENLAZAR,
  leadParaEnlazarDesde,
  type LectorDeLeadParaEnlazar,
} from '../../entities/lead-para-enlazar'

// Un lead por id para enlazarlo desde otra pantalla, con la sesión de quien mira. Por la clave primaria de `leads` (`leads_vista` es `security_invoker`): la
// RLS decide, y lo que no se ve no llega. `ok(null)` sólo cuando la lectura respondió sin fila; un error de la lectura es un error.
export const getLeadParaEnlazar: LectorDeLeadParaEnlazar = async (id) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leads_vista')
    .select(COLUMNAS_DEL_LEAD_PARA_ENLAZAR)
    .eq('id', id)
    .limit(1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const fila = data[0]
  if (fila === undefined) {
    return ok(null)
  }
  const lead = leadParaEnlazarDesde(fila)
  return lead === null ? fallo('inesperado', MENSAJE_INESPERADO) : ok(lead)
}
