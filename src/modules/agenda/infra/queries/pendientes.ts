import 'server-only'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/server'
import {
  GRUPOS_DE_PENDIENTES,
  paginaDePendientes,
  type GrupoDePendientes,
  type LectorDePendientes,
  type PaginaDePendientes,
  type PendientesDeAgenda,
} from '../../entities/pendientes'

type Cliente = Awaited<ReturnType<typeof createClient>>

// La primera página de un grupo, con la sesión de quien mira (las RPC son de invocador). Cada una por su índice:
// «vencidas», `tareas_pendientes_idx (responsable_id, vence_en, id)`; «recordatorios», `recordatorios_usuario_idx (usuario_id, recordar_en)`;
// «sin fecha», `tareas_sin_fecha_idx (responsable_id, creado_en desc, id desc)`. Todas parciales en lo pendiente.
async function leerGrupo(
  supabase: Cliente,
  grupo: GrupoDePendientes,
  hasta: string,
): Promise<Resultado<PaginaDePendientes>> {
  const { data, error } =
    grupo === 'sin_fecha'
      ? await supabase.rpc('agenda_tareas_sin_fecha', { p_tamano: TAMANO_DE_VER_MAS })
      : await supabase.rpc('agenda_pendientes', {
          p_grupo: grupo,
          p_tamano: TAMANO_DE_VER_MAS,
          ...(grupo === 'recordatorios' ? { p_hasta: hasta } : {}),
        })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const pagina = paginaDePendientes(grupo, data)
  return pagina ? ok(pagina) : fallo('inesperado', 'No pudimos leer tus pendientes.')
}

// Los grupos pedidos, en paralelo y en el servidor: la columna de pendientes llega en el primer documento, tras su `<Suspense>`.
export const getPendientes: LectorDePendientes = async ({ hasta, grupos }) => {
  const supabase = await createClient()
  const leidas = await Promise.all(
    GRUPOS_DE_PENDIENTES.map((grupo) =>
      grupos.includes(grupo) ? leerGrupo(supabase, grupo, hasta) : Promise.resolve(null),
    ),
  )
  const pendientes: PendientesDeAgenda = { vencidas: null, recordatorios: null, sin_fecha: null }
  for (const [indice, grupo] of GRUPOS_DE_PENDIENTES.entries()) {
    const leida = leidas[indice]
    if (!leida) {
      continue
    }
    if (!leida.ok) {
      return leida
    }
    pendientes[grupo] = leida.data
  }
  return ok(pendientes)
}
