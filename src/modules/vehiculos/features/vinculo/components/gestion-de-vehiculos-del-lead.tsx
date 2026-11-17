import { connection } from 'next/server'
import { leerVehiculosDelLead } from '../../../composicion'
import { GestionDelLead } from './gestion-del-lead'

type Props = { leadId: string; leadNombre: string }

// Lo que la ficha del lead dibuja de «Vehículos» al pie de Relacionados, leído en el servidor con la sesión de quien mira: los vínculos
// anteriores, el panel para vincular o marcar uno (`?panel=agregar-vehiculo`) y la confirmación de desvincular (`?panel=desvincular`).
// Vinculados e interesados ya los muestra Relacionados (con sus acciones). Va detrás de su `<Suspense>`; si la lectura falla no dibuja
// nada (Relacionados dice lo suyo) y la ficha sigue. `leerVehiculosDelLead` es una lectura por pedido (la comparten las notas).
export async function GestionDeVehiculosDelLead({ leadId, leadNombre }: Props) {
  await connection()
  const leido = await leerVehiculosDelLead(leadId)
  if (!leido.ok) {
    return null
  }
  return <GestionDelLead leadId={leadId} leadNombre={leadNombre} datos={leido.data} />
}
