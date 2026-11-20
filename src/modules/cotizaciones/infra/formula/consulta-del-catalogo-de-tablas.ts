// El catálogo de tablas de un origen para el compilador de la fórmula (BUSCARV): la clave y las claves de las columnas de las activas del origen y de las
// compartidas, sobre el cliente que recibe (el del servidor, con la sesión de quien configura: la policy de lectura de `tablas_referencia` decide). Una lectura que
// falla, o una forma que no se entiende, da null: la fórmula se edita igual y BUSCARV dice que no pudimos leer las tablas (nunca el mensaje de la base).
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { cortarAlTope } from '@/shared/lib/conteo'
import type { Database } from '@/shared/types/database.types'
import {
  catalogoDe,
  TOPE_DE_TABLAS_DEL_CATALOGO,
  type TablaLeida,
} from '../../entities/formula/catalogo-de-tablas'
import type { TablaDelCatalogo } from '../../entities/compilador'

type Cliente = SupabaseClient<Database>

const esquemaDeLaTabla = z.object({
  clave: z.string(),
  origen_id: z.guid().nullable(),
  columnas: z.array(z.object({ clave: z.string() })),
})

// Por `tablas_referencia_origen_id_clave_key (origen_id, clave)`: por clave, la del origen antes que la compartida, con tope + 1.
export function consultaDelCatalogo(cliente: Cliente, origenId: string) {
  return cliente
    .from('tablas_referencia')
    .select('clave, origen_id, columnas')
    .eq('activa', true)
    .or(`origen_id.eq.${origenId},origen_id.is.null`)
    .order('clave')
    .order('origen_id', { nullsFirst: false })
    .limit(TOPE_DE_TABLAS_DEL_CATALOGO + 1)
}

export async function leerCatalogoDeTablasSobre(
  cliente: Cliente,
  origenId: string,
): Promise<TablaDelCatalogo[] | null> {
  // El origen va dentro del filtro `or`: sólo un guid.
  if (!z.guid().safeParse(origenId).success) return null
  const { data, error } = await consultaDelCatalogo(cliente, origenId)
  if (error) return null
  const leidas = z.array(esquemaDeLaTabla).safeParse(data)
  if (!leidas.success) return null
  // La 101.ª y las que siguen no entran, como en la lista de tablas.
  const { filas } = cortarAlTope(leidas.data, TOPE_DE_TABLAS_DEL_CATALOGO)
  const tablas: TablaLeida[] = filas.map((t) => ({
    clave: t.clave,
    compartida: t.origen_id === null,
    columnas: t.columnas.map((c) => c.clave),
  }))
  return catalogoDe(tablas)
}
