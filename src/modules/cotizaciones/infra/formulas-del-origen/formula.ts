// Una fórmula del origen por su id (la cabeza de su editor: el nombre, el estado y el «⋯»), con la activa del origen (la esperada de activar y lo que
// «Activar» dice que deja de usarse). Nula si no existe, es de otro origen o quien mira no configura el cotizador de ese origen (la policy no la deja ver).
import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { FormulaDeLaLista } from '../../entities/formulas-del-origen/lista'
import { COLUMNAS_DE_LA_FILA, conSusPiezas, NO_SE_LEYERON, type Cliente } from './piezas'

export type ActivaDelOrigen = { id: string; nombre: string }

export type FormulaAbierta = { formula: FormulaDeLaLista; activa: ActivaDelOrigen | null }

const esquemaDeLaActiva = z.array(z.object({ id: z.guid(), nombre: z.string() })).max(1)

export async function leerLaFormulaDelOrigenSobre(
  cliente: Cliente,
  origenId: string,
  id: string,
): Promise<Resultado<FormulaAbierta | null>> {
  if (!z.guid().safeParse(origenId).success || !z.guid().safeParse(id).success) {
    return ok(null)
  }
  // La fila por la PK; la activa por `formulas_del_origen_activa_unica (origen_id) where activa`.
  const [fila, activa] = await Promise.all([
    cliente
      .from('formulas_del_origen')
      .select(COLUMNAS_DE_LA_FILA)
      .eq('id', id)
      .eq('origen_id', origenId)
      .limit(1),
    cliente
      .from('formulas_del_origen')
      .select('id, nombre')
      .eq('origen_id', origenId)
      .eq('activa', true)
      .limit(1),
  ])
  const error = fila.error ?? activa.error
  if (error) return { ok: false, error: errorDePostgrest(error) }
  const leida = await conSusPiezas(cliente, fila.data)
  if (!leida.ok) return leida
  const [formula] = leida.data
  const activas = esquemaDeLaActiva.safeParse(activa.data)
  if (!activas.success) return fallo('inesperado', NO_SE_LEYERON)
  if (formula === undefined) return ok(null)
  return ok({ formula, activa: activas.data[0] ?? null })
}
