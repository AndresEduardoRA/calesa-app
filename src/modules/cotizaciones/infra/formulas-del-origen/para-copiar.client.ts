// Las fórmulas de un origen que se pueden copiar (el modal «Nueva fórmula»), desde el navegador con la sesión de quien mira: las no archivadas (a lo sumo 50,
// el tope) y, si se pidió copiar una archivada, también esa. La policy deja ver sólo los orígenes donde configura el cotizador; la base lo vuelve a pedir al crear.
import { z } from 'zod'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, fallo, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { TOPE_DE_FORMULAS_DEL_ORIGEN } from '../../entities/formula-del-origen'
import { ordenDeLaLista, type FormulaDeLaLista } from '../../entities/formulas-del-origen/lista'
import { COLUMNAS_DE_LA_FILA, conSusPiezas } from './piezas'

export type FormulasParaCopiar = { formulas: FormulaDeLaLista[]; hayMas: boolean }

const esquemaDelPedido = z.object({ origenId: z.guid(), copiaId: z.guid().nullable() })

export async function leerFormulasParaCopiar(
  origenId: string,
  copiaId: string | null = null,
): Promise<Resultado<FormulasParaCopiar>> {
  const pedido = esquemaDelPedido.safeParse({ origenId, copiaId })
  if (!pedido.success) return fallo('validacion', 'Ese origen no es válido.')
  const cliente = createClient()
  const condicion = pedido.data.copiaId
    ? `archivada_en.is.null,id.eq.${pedido.data.copiaId}`
    : 'archivada_en.is.null'
  // Por `formulas_del_origen_origen_idx (origen_id, archivada_en, creado_en desc, id desc)` (y la PK para la archivada pedida).
  const { data, error } = await cliente
    .from('formulas_del_origen')
    .select(COLUMNAS_DE_LA_FILA)
    .eq('origen_id', pedido.data.origenId)
    .or(condicion)
    .order('creado_en', { ascending: false })
    .order('id', { ascending: false })
    .limit(TOPE_DE_FORMULAS_DEL_ORIGEN + 2)
  if (error) return { ok: false, error: errorDePostgrest(error) }
  const { filas, hayMas } = cortarAlTope(data, TOPE_DE_FORMULAS_DEL_ORIGEN + 1)
  const leidas = await conSusPiezas(cliente, filas)
  if (!leidas.ok) return leidas
  return { ok: true, data: { formulas: ordenDeLaLista(leidas.data), hayMas } }
}
