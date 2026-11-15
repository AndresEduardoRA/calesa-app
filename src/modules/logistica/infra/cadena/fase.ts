import 'server-only'
import { errorDePostgrest, fallo, type Resultado } from '@/shared/lib/errores'
import { TAMANO_DE_LA_FASE } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/server'
import { paginaDeLaFaseDesde } from '../../entities/cadena/leer'
import type { LectorDeLaFase } from '../../entities/cadena/repositorios'

// La lista de una fase se lee con `logistica_cadena_columna()` (6.02-2), de a `TAMANO_DE_LA_FASE`, por cursor `(fase_desde, id)` sobre `vehiculos_cadena_idx` y, con el alcance «propios», desde
// `_logistica_lo_propio`. Con la sesión de quien mira: la base decide el acceso. La respuesta es `Json`: la entidad la valida.

const NO_SE_PUDO_CARGAR_LA_FASE = 'No se pudo cargar la fase. Intenta de nuevo.'

// `p_fase` no admite nulo en los tipos generados; la base sí («Sin fase»).
const faseParaLaBase = (faseId: string | null): string => faseId as string

export const leerFaseDeLaBase: LectorDeLaFase = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('logistica_cadena_columna', {
    p_origen: pedido.origenId,
    p_fase: faseParaLaBase(pedido.faseId),
    ...(pedido.cursor?.desde ? { p_desde: pedido.cursor.desde } : {}),
    ...(pedido.cursor ? { p_id: pedido.cursor.id } : {}),
    p_tope: TAMANO_DE_LA_FASE,
    p_filtros: { ...pedido.filtros },
  })
  if (error) {
    // Un cursor inválido o una fase ajena no son algo que la persona pueda corregir: se dice que no cargó.
    return error.code === '22023'
      ? (fallo('regla', NO_SE_PUDO_CARGAR_LA_FASE) as Resultado<never>)
      : { ok: false, error: errorDePostgrest(error) }
  }
  return paginaDeLaFaseDesde(data)
}
