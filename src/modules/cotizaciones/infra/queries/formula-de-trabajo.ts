// La fórmula de trabajo de un origen (docs/GLOSARIO.md): la que leen y escriben las sub-pestañas Fórmula, Hoja y Tarjeta de la página del origen. La activa o, si no hay, la más nueva
// sin archivar: espejo de `_fdo_de_trabajo()`, que es la que usan las RPC cuando no reciben `p_formula_del_origen`. Sobre el cliente que recibe (las lecturas del
// servidor pasan el de la sesión): la policy `formulas_del_origen: leer` deja ver sólo los orígenes donde tiene `cotizaciones.configurar`. Nula si el origen
// todavía no tiene ninguna: la crea el primer guardado.
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { Database } from '@/shared/types/database.types'
import {
  esquemaDeLaFormulaDelOrigen,
  formulaDelOrigenDesde,
  type FormulaDelOrigen,
} from '../../entities/formula-del-origen'

type Cliente = SupabaseClient<Database>

// Una fila: las no archivadas del origen por `formulas_del_origen_origen_idx (origen_id, archivada_en, creado_en desc, id desc)` (a lo sumo 50, el tope), la activa
// primero y después la más nueva, como `_fdo_de_trabajo()`.
export function consultaDeLaFormulaDeTrabajo(cliente: Cliente, origenId: string) {
  return cliente
    .from('formulas_del_origen')
    .select('id, nombre, activa, actualizado_en')
    .eq('origen_id', origenId)
    .is('archivada_en', null)
    .order('activa', { ascending: false })
    .order('creado_en', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
}

const NO_SE_LEYO = 'No pudimos leer la fórmula del origen.'

export async function leerFormulaDeTrabajoSobre(
  cliente: Cliente,
  origenId: string,
): Promise<Resultado<FormulaDelOrigen | null>> {
  if (!z.guid().safeParse(origenId).success) {
    return fallo('validacion', 'Ese origen no es válido.')
  }
  const { data, error } = await consultaDeLaFormulaDeTrabajo(cliente, origenId)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = z.array(esquemaDeLaFormulaDelOrigen).max(1).safeParse(data)
  if (!filas.success) {
    return fallo('inesperado', NO_SE_LEYO)
  }
  const [fila] = filas.data
  return ok(fila === undefined ? null : formulaDelOrigenDesde(fila))
}
