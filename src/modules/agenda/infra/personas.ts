import 'server-only'
import { errorDePostgrest, fallo, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  personasDeQuienesReciben,
  textoDeBusqueda,
  type PedidoDeQuienesPueden,
  type PersonasEncontradas,
} from '../entities/personas'

// A quién darle una tarea para destrabar algo de una unidad (lo pide `logistica`, «Pedirlo» de «Qué falta»): `agenda_quienes_reciben` con el permiso y el
// vehículo, con la sesión de quien pide (la base exige `agenda.tareas.asignar` y que vea la unidad). Sin texto (o con menos de 3 letras) lista hasta el tope.
export async function leerQuienesPuedenRecibir({
  texto,
  permiso,
  vehiculoId,
}: PedidoDeQuienesPueden): Promise<Resultado<PersonasEncontradas>> {
  const supabase = await createClient()
  const buscado = texto === undefined ? null : textoDeBusqueda(texto)
  const { data, error } = await supabase.rpc('agenda_quienes_reciben', {
    p_texto: buscado ?? '',
    p_permiso: permiso,
    p_vehiculo: vehiculoId,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leidas = personasDeQuienesReciben(data)
  return leidas.ok ? leidas : fallo('inesperado', leidas.error.mensaje)
}
