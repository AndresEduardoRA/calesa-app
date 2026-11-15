import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { conteoAcotado } from '@/shared/lib/conteo'
import type { LectorDeResolucionDeSubasta, LectorDeSinResolver } from '../../entities/repositorios'
import { TOPE_DE_SIN_RESOLVER } from '../../entities/situacion'

const fila = z.object({
  subasta_resultado: z.enum(['ganada', 'no_ganada']).nullable().catch(null),
  subasta_resuelta_en: z.string().nullable(),
  resuelta: z.object({ nombre: z.string().nullable() }).nullable().catch(null),
})

// Quién resolvió la subasta y cuándo, por la clave primaria y con la RLS de quien mira (lo que no ve vuelve null). El nombre sale de `perfiles` por
// `subasta_resuelta_por` (índice `vehiculos_subasta_resuelta_por_idx`).
export const getResolucionDeSubasta: LectorDeResolucionDeSubasta = async (vehiculoId) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vehiculos')
    .select(
      'subasta_resultado, subasta_resuelta_en, resuelta:perfiles!vehiculos_subasta_resuelta_por_fkey(nombre)',
    )
    .eq('id', vehiculoId)
    .limit(1)
    .maybeSingle()
  if (error) return { ok: false, error: errorDePostgrest(error) }
  if (!data) return ok(null)
  const leida = fila.safeParse(data)
  if (!leida.success) return ok(null)
  return ok({
    resultado: leida.data.subasta_resultado,
    resueltaEn: leida.data.subasta_resuelta_en,
    nombre: leida.data.resuelta?.nombre?.trim() || null,
  })
}

// Cuántas «Sin resolver» hay en el origen, hasta el tope: pide `tope + 1` filas (de una sola columna: no es una página del inventario) por `vehiculos_situacion_idx` (origen_id, situacion, creado_en desc, id desc), nunca
// un `count`. Con la RLS de quien mira (en «propios», las suyas).
export const getCantidadSinResolver: LectorDeSinResolver = async (origenId) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vehiculos')
    .select('situacion')
    .eq('origen_id', origenId)
    .eq('situacion', 'sin_resolver')
    .is('eliminado_en', null)
    .order('creado_en', { ascending: false })
    .order('id', { ascending: false })
    .limit(TOPE_DE_SIN_RESOLVER + 1)
  if (error) return { ok: false, error: errorDePostgrest(error) }
  return ok(conteoAcotado(data.length, TOPE_DE_SIN_RESOLVER))
}
