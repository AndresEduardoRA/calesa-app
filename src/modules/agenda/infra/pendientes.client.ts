// «Ver más» de los pendientes, leído en el navegador con la sesión de quien mira (las RPC son de invocador: la RLS decide qué llega). Una página de
// `TAMANO_DE_VER_MAS` por cursor: «vencidas» por `tareas_pendientes_idx`, «recordatorios» por `recordatorios_usuario_idx` y «sin fecha» por
// `tareas_sin_fecha_idx`. La primera página la lee el servidor (`infra/queries/pendientes.ts`).
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/browser'
import { paginaDePendientes, type LectorDeMasPendientes } from '../entities/pendientes'

export const leerMasPendientes: LectorDeMasPendientes = async ({ grupo, cursor, hasta }) => {
  const supabase = createClient()
  const { data, error } =
    grupo === 'sin_fecha'
      ? await supabase.rpc('agenda_tareas_sin_fecha', {
          p_tamano: TAMANO_DE_VER_MAS,
          p_antes_en: cursor.en,
          p_antes_id: cursor.id,
        })
      : await supabase.rpc('agenda_pendientes', {
          p_grupo: grupo,
          p_tamano: TAMANO_DE_VER_MAS,
          p_despues_en: cursor.en,
          p_despues_id: cursor.id,
          ...(grupo === 'recordatorios' ? { p_hasta: hasta } : {}),
        })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const pagina = paginaDePendientes(grupo, data)
  return pagina ? ok(pagina) : fallo('inesperado', 'No pudimos leer más pendientes.')
}
