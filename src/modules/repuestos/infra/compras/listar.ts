import 'server-only'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/server'
import {
  COLUMNAS_DE_COMPRA,
  TOPE_DE_COMPRAS,
  filasDeCompraDesde,
  type FilaDeCompra,
} from '../../entities/compras/compra'
import { MENSAJE_COMPRAS_DEL_ITEM } from '../../entities/compras/errores'

// Las compras de un proyecto para la pestaña «Compras» (8.11-2, C2): una consulta con el ítem embebido. `limit 201` (el tope más uno) sobre
// `repuestos_compras_proyecto_id_idx`: ordena sólo las compras de un proyecto, así que no crece con la tabla. La RLS decide (vivas y con
// `repuestos.costos.ver`): sin el permiso devuelve cero filas. Las más recientes primero.
export async function leerComprasDelProyecto(
  proyectoId: string,
): Promise<Resultado<{ filas: FilaDeCompra[]; hayMas: boolean }>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('repuestos_compras')
    .select(COLUMNAS_DE_COMPRA)
    .eq('proyecto_id', proyectoId)
    .is('eliminado_en', null)
    .order('fecha', { ascending: false })
    .order('creado_en', { ascending: false })
    .order('id', { ascending: false })
    .limit(TOPE_DE_COMPRAS + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = filasDeCompraDesde(data)
  return filas === null
    ? fallo('inesperado', 'No se pudieron cargar las compras.')
    : ok(cortarAlTope(filas, TOPE_DE_COMPRAS))
}

// Las compras de un ítem para el bloque «Compras» de su panel: las más recientes, `limit TAMANO_DE_VER_MAS + 1` sobre `repuestos_compras_item_id_idx` (ordena sólo las de un
// ítem). La RLS decide (vivas y con `repuestos.costos.ver`); la action lo pide antes de llegar acá.
export async function leerComprasDelItem(
  itemId: string,
): Promise<Resultado<{ filas: FilaDeCompra[]; hayMas: boolean }>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('repuestos_compras')
    .select(COLUMNAS_DE_COMPRA)
    .eq('item_id', itemId)
    .is('eliminado_en', null)
    .order('fecha', { ascending: false })
    .order('creado_en', { ascending: false })
    .order('id', { ascending: false })
    .limit(TAMANO_DE_VER_MAS + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = filasDeCompraDesde(data)
  return filas === null
    ? fallo('inesperado', MENSAJE_COMPRAS_DEL_ITEM)
    : ok(cortarAlTope(filas, TAMANO_DE_VER_MAS))
}
