// Lo que la sección «Oportunidades» de la ficha lee en el navegador, con la sesión de quien mira: «Ver más» (la página que sigue al
// cursor). La misma RPC de invocadora que lee el servidor: la RLS decide qué llega; acá no se decide nada.
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/browser'
import { oportunidadesDelLeadDesde } from '../entities/oportunidad'
import { LEIDAS_PARA_EL_AVISO } from '../entities/oportunidad-rapida'
import type {
  LectorDelAvisoDeOportunidades,
  LectorDeMasOportunidades,
} from '../entities/repositorios-de-oportunidades'

export const leerMasOportunidades: LectorDeMasOportunidades = async ({ leadId, antes }) => {
  const { data, error } = await createClient().rpc('lead_oportunidades', {
    p_lead: leadId,
    p_tamano: TAMANO_DE_VER_MAS,
    p_antes_abierta: antes.antesAbierta,
    p_antes_en: antes.antesEn,
    p_antes_id: antes.antesId,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const pagina = oportunidadesDelLeadDesde(data)
  return pagina ? ok(pagina) : fallo('inesperado', 'No pudimos leer las oportunidades.')
}

// El aviso de «Nueva oportunidad…»: la primera página corta del lead (las abiertas primero, por `oportunidades_lead_abiertas_idx` y
// `oportunidades_lead_cerradas_idx`), una más de las que se muestran. Sin cursor ni cuenta.
export const leerOportunidadesDelAviso: LectorDelAvisoDeOportunidades = async (leadId) => {
  const { data, error } = await createClient().rpc('lead_oportunidades', {
    p_lead: leadId,
    p_tamano: LEIDAS_PARA_EL_AVISO,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const pagina = oportunidadesDelLeadDesde(data)
  return pagina ? ok(pagina) : fallo('inesperado', 'No pudimos leer las oportunidades.')
}
