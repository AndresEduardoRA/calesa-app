import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  motivoDelRechazoDeCopiar,
  respuestaDeCopiarFasesDesde,
} from '../../entities/fases/copiar-fases'
import type { CopiadorDeFases } from '../../entities/fases/repositorios'

const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

// `flujo_copiar_fases`: el `PT409` conserva el texto de la base; los demás rechazos llevan la frase de la app según código y `hint`.
export const copiarFasesSupabase: CopiadorDeFases = async ({
  flujoId,
  actualizadoEnEsperado,
  desdeFlujoId,
}) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('flujo_copiar_fases', {
    p_flujo: flujoId,
    p_actualizado_en_esperado: actualizadoEnEsperado,
    p_desde: desdeFlujoId,
  })
  if (error) {
    const base = errorDePostgrest(error)
    const motivo =
      base.codigo === 'conflicto' ? null : motivoDelRechazoDeCopiar(error.code, error.hint)
    return { ok: false, error: motivo ? { ...base, mensaje: motivo } : base }
  }
  const leido = respuestaDeCopiarFasesDesde(data)
  return leido ? ok(leido) : fallo('inesperado', NO_SE_LEYO)
}
