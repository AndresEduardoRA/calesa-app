import 'server-only'
import { createClient } from '@/shared/lib/supabase/server'
import { retocarSobre, type PedidoDeRetoques } from './rpc-de-los-retoques'

// Retocar la tarjeta con el cliente de la sesión, uno por pedido (la base decide si se puede).
export async function setRetoques(pedido: PedidoDeRetoques) {
  return retocarSobre(await createClient(), pedido)
}
