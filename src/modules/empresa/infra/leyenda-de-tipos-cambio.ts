import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioLeyendaDeTiposCambio } from '../entities/repositorios'

// Por RPC: la base exige `empresa.tipos_cambio.gestionar`, el largo y la versión de la fila (`PT409`).
const guardar: RepositorioLeyendaDeTiposCambio['guardar'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('empresa_guardar_leyenda_de_tipos_cambio', {
    p_leyenda: pedido.leyenda ?? '',
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok({ actualizadoEn: data })
}

export const leyendaDeTiposCambioSupabase: RepositorioLeyendaDeTiposCambio = { guardar }
