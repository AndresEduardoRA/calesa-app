// Las fórmulas del origen con sus piezas de hoy (el borrador y la publicada de `formulas` y de `plantillas_tarjeta`), sobre el cliente que recibe: el del
// servidor (la lista, la cabeza del editor) o el del navegador (las archivadas, las de copiar). Dos lecturas y no un embebido: las piezas se unen por
// `formula_del_origen_id` y van por los índices únicos parciales del borrador y de la publicada. La policy de las tres tablas deja ver sólo los orígenes
// donde quien mira tiene `cotizaciones.configurar`.
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { Database } from '@/shared/types/database.types'
import {
  esquemaDeLaFilaDeLaLista,
  formulaDeLaLista,
  type FormulaDeLaLista,
} from '../../entities/formulas-del-origen/lista'

export type Cliente = SupabaseClient<Database>

export const COLUMNAS_DE_LA_FILA =
  'id, nombre, activa, activada_en, archivada_en, copiada_de_otro_origen, actualizado_en'

const COLUMNAS_DE_LA_PIEZA = 'id, formula_del_origen_id, estado, version, actualizado_en'

export const NO_SE_LEYERON = 'No pudimos leer las fórmulas del origen.'

const esquemaDeLasFilas = z.array(
  esquemaDeLaFilaDeLaLista.omit({ formulas: true, plantillas_tarjeta: true }),
)
const esquemaDeLasPiezas = z.array(
  esquemaDeLaFilaDeLaLista.shape.formulas.element.extend({ formula_del_origen_id: z.guid() }),
)

type Piezas = z.infer<typeof esquemaDeLasPiezas>

// El borrador y la publicada de cada fórmula (a lo sumo dos por fórmula: los índices únicos parciales).
function leerPiezas(cliente: Cliente, tabla: 'formulas' | 'plantillas_tarjeta', ids: string[]) {
  return cliente
    .from(tabla)
    .select(COLUMNAS_DE_LA_PIEZA)
    .in('formula_del_origen_id', ids)
    .in('estado', ['borrador', 'publicada'])
    .limit(ids.length * 2)
}

const deLaFormula = (piezas: Piezas, id: string) =>
  piezas.filter((p) => p.formula_del_origen_id === id)

// Valida las filas leídas y les suma sus piezas. Sin filas no lee nada más.
export async function conSusPiezas(
  cliente: Cliente,
  leidas: unknown,
): Promise<Resultado<FormulaDeLaLista[]>> {
  const filas = esquemaDeLasFilas.safeParse(leidas)
  if (!filas.success) return fallo('inesperado', NO_SE_LEYERON)
  if (filas.data.length === 0) return ok([])
  const ids = filas.data.map((f) => f.id)
  const [formulas, tarjetas] = await Promise.all([
    leerPiezas(cliente, 'formulas', ids),
    leerPiezas(cliente, 'plantillas_tarjeta', ids),
  ])
  const error = formulas.error ?? tarjetas.error
  if (error) return { ok: false, error: errorDePostgrest(error) }
  const deFormulas = esquemaDeLasPiezas.safeParse(formulas.data)
  const deTarjetas = esquemaDeLasPiezas.safeParse(tarjetas.data)
  if (!deFormulas.success || !deTarjetas.success) return fallo('inesperado', NO_SE_LEYERON)
  return ok(
    filas.data.map((fila) =>
      formulaDeLaLista({
        ...fila,
        formulas: deLaFormula(deFormulas.data, fila.id),
        plantillas_tarjeta: deLaFormula(deTarjetas.data, fila.id),
      }),
    ),
  )
}
