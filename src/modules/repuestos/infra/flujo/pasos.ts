import 'server-only'
import { createClient } from '@/shared/lib/supabase/server'
import {
  CLAVES_DATO_DE_HITO,
  TOPE_DE_FASES_DE_LOS_PASOS,
  TOPE_DE_REQUISITOS_DE_LOS_PASOS,
  TOPE_DE_SALIDAS_DE_LOS_PASOS,
  flujoDeLosPasosDesde,
  type LecturaDeLosPasos,
} from '../../entities/flujo/pasos-del-flujo'

// El flujo de repuestos para los pasos de `/repuestos/[id]`: tres lecturas en paralelo, todas de configuración (`using (true)`: las lee todo `authenticated`) y con
// su tope más uno. El flujo de repuestos es una sola fila de `flujos` (`ambito = 'repuestos'`), que filtra cada una por `!inner`. Un error de lectura no lanza: los
// pasos dicen que no se pudieron leer y la hoja sigue.
export async function leerFlujoDeLosPasos(): Promise<LecturaDeLosPasos> {
  const supabase = await createClient()
  const [fases, salidas, pedidos] = await Promise.all([
    // Por `fases_flujo_id_nombre_key` (prefijo `flujo_id`).
    supabase
      .from('fases')
      .select('id, nombre, color, orden, activa, es_inicial, es_final, flujo:flujos!inner(ambito)')
      .eq('flujo.ambito', 'repuestos')
      .order('orden', { ascending: true })
      .order('id', { ascending: true })
      .limit(TOPE_DE_FASES_DE_LOS_PASOS + 1),
    // Por `fases_transiciones_flujo_id_idx`.
    supabase
      .from('fases_transiciones')
      .select('de_fase_id, a_fase_id, accion, flujo:flujos!inner(ambito)')
      .eq('flujo.ambito', 'repuestos')
      .order('id', { ascending: true })
      .limit(TOPE_DE_SALIDAS_DE_LOS_PASOS + 1),
    // Por `fases_requisitos_fase_id_idx`: sólo los de dato con una clave de hito.
    supabase
      .from('fases_requisitos')
      .select('fase_id, clave_dato, bloqueante, fase:fases!inner(flujo:flujos!inner(ambito))')
      .eq('fase.flujo.ambito', 'repuestos')
      .eq('tipo', 'dato')
      .in('clave_dato', CLAVES_DATO_DE_HITO)
      .order('id', { ascending: true })
      .limit(TOPE_DE_REQUISITOS_DE_LOS_PASOS + 1),
  ])
  if (fases.error || salidas.error || pedidos.error) return { estado: 'ilegible' }
  return flujoDeLosPasosDesde(fases.data, salidas.data, pedidos.data)
}
