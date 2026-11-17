import 'server-only'
import { cache } from 'react'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { leyendaDesde } from '../../entities/compartir-tipos-cambio'
import type { LectorDeLeyendaDeTiposCambio } from '../../entities/repositorios'

// La leyenda con la versión de la fila, para Configuración › Empresa › Monedas. La lee cualquier cuenta con sesión; guardarla pide
// `empresa.tipos_cambio.gestionar`. Si falla, falla (la pantalla dice el error): una leyenda vacía de fábrica se guardaría encima de la
// verdadera. `ajustes_empresa` es una fila.
export const getLeyendaDeTiposCambio: LectorDeLeyendaDeTiposCambio = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ajustes_empresa')
    .select('leyenda_tipos_cambio, actualizado_en')
    .eq('id', 1)
    .single()
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(leyendaDesde(data))
})
