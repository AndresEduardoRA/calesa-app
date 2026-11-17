// Los tipos de cambio vigentes del popover de la barra superior, leídos desde el navegador al abrirlo (no en cada pantalla): una RPC
// `security definer` que da a toda persona activa el último cambio de cada uno, que el historial sólo deja ver a quien gestiona.
import { errorDePostgrest, fallo, MENSAJE_INESPERADO, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import type { LectorDeTiposCambioVigentes } from '../entities/repositorios'
import {
  esquemaDeTipoCambioVigente,
  TOPE_DEL_POPOVER,
  vigentesDesde,
} from '../entities/tipos-cambio-vigentes'

const esquemaDeLaLectura = esquemaDeTipoCambioVigente.array()

// Uno de más: el popover dice que hay otros. La tabla es un catálogo de decenas; el último cambio de cada uno va por
// `tipos_cambio_historial_tipo_idx` (un `limit 1` por tipo) y los nombres por `perfiles_pkey`.
export const leerTiposCambioVigentes: LectorDeTiposCambioVigentes = async () => {
  const { data, error } = await createClient()
    .rpc('tipos_cambio_vigentes')
    .limit(TOPE_DEL_POPOVER + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = esquemaDeLaLectura.safeParse(data)
  if (!filas.success) {
    return fallo('inesperado', MENSAJE_INESPERADO)
  }
  return ok(vigentesDesde(filas.data))
}
