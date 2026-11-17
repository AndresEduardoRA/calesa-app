import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  paginaDeRecordatoriosDesde,
  type LectorDeRecordatoriosDelLead,
} from '../../entities/pagina-de-recordatorios'

// Los recordatorios pendientes de quien mira sobre un lead, los más próximos primero (`recordar_en` ascendente: los vencidos van
// primero), leídos en el servidor con su sesión para el bloque «Seguimientos y recordatorios» de la ficha. `lead_recordatorios()` va por
// `recordatorios_lead_pendientes_idx` y pide uno de más (`hay_mas`) y si hay completados; la RLS deja sólo los suyos. Nunca un conteo.
export const getRecordatoriosDelLead: LectorDeRecordatoriosDelLead = async ({ leadId, tamano }) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('lead_recordatorios', {
    p_lead: leadId,
    p_completados: false,
    p_tamano: tamano,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const pagina = paginaDeRecordatoriosDesde(data)
  return pagina ? ok(pagina) : fallo('inesperado', 'No pudimos leer los recordatorios.')
}
