import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDeTiposDeSeguimiento } from '../../entities/repositorios'
import {
  type LectorDeSeguimientos,
  paginaDeSeguimientosDesde,
  TAMANO_DE_PAGINA_DE_SEGUIMIENTOS,
} from '../../entities/seguimiento'

// La primera página de la línea de tiempo (o los últimos `tamano`), con la sesión de quien mira: la RLS deja los suyos y los
// públicos de los demás. `lead_seguimientos()` va por `seguimientos_lead_autor_idx` y `seguimientos_lead_publicos_idx` y pide uno de más.
// Nunca un conteo.
export const getSeguimientos: LectorDeSeguimientos = async ({ leadId, antes, tamano }) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('lead_seguimientos', {
    p_lead: leadId,
    p_tamano: tamano ?? TAMANO_DE_PAGINA_DE_SEGUIMIENTOS,
    ...(antes ? { p_antes_en: antes.antesEn, p_antes_id: antes.antesId } : {}),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const pagina = paginaDeSeguimientosDesde(data)
  return pagina ? ok(pagina) : fallo('inesperado', 'No pudimos leer los seguimientos.')
}

// Los activos, en su orden: los nombres salen de la base, ninguno está escrito en la pantalla.
export const getTiposDeSeguimiento: LectorDeTiposDeSeguimiento = async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tipos_seguimiento')
    .select('id, nombre')
    .eq('activo', true)
    .order('orden')
    .order('nombre')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(data.map((t) => ({ ...t })))
}
