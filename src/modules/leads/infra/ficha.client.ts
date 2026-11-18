// La ficha de un lead leída en el navegador, con la sesión de quien mira (`lead_ficha()`): lo que el panel de edición necesita cuando se
// abre desde el «⋯» de la lista o del kanban (la versión, los atributos que quien mira recibe, los teléfonos), donde la ficha no está
// debajo. Lo mismo que `getFicha()` del servidor: lo que no ve, no existe (nulo). Un pedido por apertura, nunca uno por fila.
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { fichaDesde } from '../entities/ficha'
import type { LectorDeFicha } from '../entities/repositorios'

export const leerFichaDelLead: LectorDeFicha = async (id) => {
  const { data, error } = await createClient().rpc('lead_ficha', { p_lead: id })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  if (data === null) {
    return ok(null)
  }
  const ficha = fichaDesde(data)
  return ficha ? ok(ficha) : fallo('inesperado', 'No pudimos leer la ficha del lead.')
}
