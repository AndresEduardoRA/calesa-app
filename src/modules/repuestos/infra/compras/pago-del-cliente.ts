import 'server-only'
import { errorDePostgrest, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'

// ¿El proyecto tiene un pago vivo? Es lo que cumple `proyecto.pago_cliente` (la misma condición que `_requisito_dato_cumple`): un pago del proyecto cubre a todos sus
// ítems. Una fila por `pagos_proyecto_repuestos_id_idx`, bajo la RLS de `repuestos.costos.ver`: la llama la página sólo con esa clave (sin ella no se lee nada de costos).
export async function hayPagoDelCliente(proyectoId: string): Promise<Resultado<boolean>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pagos')
    .select('id')
    .eq('proyecto_repuestos_id', proyectoId)
    .is('eliminado_en', null)
    .limit(1)
  if (error) return { ok: false, error: errorDePostgrest(error) }
  return ok(data.length > 0)
}
