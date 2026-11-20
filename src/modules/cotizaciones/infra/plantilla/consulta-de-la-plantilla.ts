// Las tres lecturas del editor de la plantilla de la tarjeta de una fórmula del origen (4.19-3a; la de trabajo, que resuelve `lectura.ts`), sobre el cliente que recibe, con la sesión de quien mira. Las policies recortan: `plantillas_tarjeta: leer` y
// `formulas: leer` dejan ver sólo los orígenes donde tiene `cotizaciones.configurar` (lo que no se ve vuelve vacío, sin distinguirlo de «no existe»); `tonos`, a todo `authenticated`.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database.types'
import { TOPE_DE_TONOS } from '../../entities/plantilla/lectura-de-la-plantilla'

type Cliente = SupabaseClient<Database>

// El borrador y la publicada: a lo sumo dos filas (`plantillas_borrador_unico` y `plantillas_publicada_unica`, índices únicos parciales por `formula_del_origen_id`).
export function consultaDeLasPlantillas(cliente: Cliente, formulaDelOrigenId: string) {
  return cliente
    .from('plantillas_tarjeta')
    .select('id, estado, version, definicion, nota, actualizado_en, publicado_en')
    .eq('formula_del_origen_id', formulaDelOrigenId)
    .in('estado', ['borrador', 'publicada'])
    .limit(2)
}

// La publicada de esa fórmula del origen (`formulas_publicada_unica`, por `formula_del_origen_id`): contra ella se valida la plantilla.
export function consultaDeLaFormulaPublicada(cliente: Cliente, formulaDelOrigenId: string) {
  return cliente
    .from('formulas')
    .select('id, version, definicion, diseno, visibilidad')
    .eq('formula_del_origen_id', formulaDelOrigenId)
    .eq('estado', 'publicada')
    .limit(1)
}

// El catálogo entero: la base no deja crear un 49.º (`_tonos_tope()`).
export function consultaDeLosTonos(cliente: Cliente) {
  return cliente
    .from('tonos')
    .select(
      'clave, nombre, hex, claro_fondo, claro_borde, claro_tinta, oscuro_fondo, oscuro_borde, oscuro_tinta',
    )
    .order('nombre')
    .limit(TOPE_DE_TONOS)
}
