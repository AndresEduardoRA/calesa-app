import 'server-only'
import { cache } from 'react'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { COLUMNAS_DE_FASE, fasesDesde } from '../../entities/fase'
import { TOPE_DE_FLUJOS } from '../../entities/flujo'
import type { LectorDeFases, LectorDeFlujosConFases } from '../../entities/repositorios'

// Cada origen tiene un solo flujo de vehículos (`flujos_origen_unico`). Cualquier cuenta lee las
// fases: las fichas y los filtros las nombran. Una lectura por origen y por request.
export const getFasesDeOrigen: LectorDeFases = cache(async (origenId) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('fases')
    .select(`${COLUMNAS_DE_FASE}, flujos!inner(origen_id, ambito)`)
    .eq('flujos.origen_id', origenId)
    .eq('flujos.ambito', 'vehiculos')
    .order('orden')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(fasesDesde(data))
})

// De estos flujos, los que tienen alguna fase activa: una sola consulta con una fase embebida por flujo (`fases_flujo_id_nombre_key`, flujo_id primero) y a
// lo sumo `TOPE_DE_FLUJOS` + 1 flujos (los del selector). Sólo la pide la pestaña de un flujo vacío.
export const getFlujosConFases: LectorDeFlujosConFases = async (ids) => {
  if (ids.length === 0) {
    return ok(new Set<string>())
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('flujos')
    .select('id, fases!inner(id)')
    .in('id', ids.slice(0, TOPE_DE_FLUJOS + 1))
    .eq('fases.activa', true)
    .limit(1, { referencedTable: 'fases' })
    .limit(TOPE_DE_FLUJOS + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(new Set(data.map((fila) => fila.id)))
}
