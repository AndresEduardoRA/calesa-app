import 'server-only'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { ColumnaLeida, LecturaParaComparar } from '../../entities/aprobada/comparar'
import { COLUMNAS_PARA_COMPARAR, marcasParaCompararDesde } from '../../entities/aprobada/lectura'
import { hojaDeUnaGuardadaDesde } from '../../entities/hoja-de-una-guardada-lectura'

// Lo que lee «Comparar cotizaciones» (`/cotizaciones/comparar`), todo en paralelo y con el cliente de quien mira: por cada id UNA `cotizacion_hoja_guardada(p_id)` (la
// fila, el snapshot recortado y el diseño de SU versión, por `cotizaciones_pkey`; **sin** `cotizacion_evaluar`: se compara lo guardado, no un recálculo con las tablas
// de hoy) y UNA lectura de las marcas de las ≤ 3 por `cotizaciones_pkey` con la aprobada por el único `cotizaciones_aprobadas_cotizacion_id_key` (la RLS decide; ninguna
// columna del snapshot). Ninguna lista: los ids ya vienen validados (2 o 3, `idsParaComparar`).

const NO_SE_LEYO = 'No pudimos leer las cotizaciones que se comparan.'

async function leerUna(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
): Promise<ColumnaLeida> {
  const { data, error } = await supabase.rpc('cotizacion_hoja_guardada', { p_id: id })
  if (error) {
    return { id, error: errorDePostgrest(error).codigo === 'sin_permiso' ? 'sin_permiso' : 'fallo' }
  }
  const hoja = hojaDeUnaGuardadaDesde(data)
  return hoja === null ? { id, error: 'fallo' } : { id, hoja }
}

// Una columna que falla no tumba las demás (su error va en su columna); si fallan las marcas, la página no sabe si se comparan y lo dice entera (`error.tsx`).
export async function getParaComparar(
  ids: readonly string[],
): Promise<Resultado<LecturaParaComparar>> {
  const supabase = await createClient()
  const [columnas, marcas] = await Promise.all([
    Promise.all(ids.map((id) => leerUna(supabase, id))),
    supabase
      .from('cotizaciones')
      .select(COLUMNAS_PARA_COMPARAR)
      .in('id', [...ids])
      .limit(ids.length),
  ])
  if (marcas.error) {
    return { ok: false, error: errorDePostgrest(marcas.error) }
  }
  const leidas = marcasParaCompararDesde(marcas.data)
  return leidas === null ? fallo('inesperado', NO_SE_LEYO) : ok({ columnas, marcas: leidas })
}
