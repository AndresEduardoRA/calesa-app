import type { Permisos } from '@/modules/equipo'
import { getOrigenes } from '@/modules/origenes'
import { leerRelacionadosDelLead } from '@/modules/vehiculos'
import { RelacionadosDelLeadCliente } from '@/modules/vehiculos/pantallas/relacionados'
import { paraRelacionadosDe } from './para-relacionados'

// «Relacionados» de un lead, leído en el servidor (la ficha del lead), detrás de su `<Suspense>`. Un error de lectura no tumba la ficha: el bloque dice «No pudimos cargar los relacionados» con
// «Reintentar». Sólo se monta con `vehiculos.ver` (la base también lo exige).
export async function RelacionadosDelLeadServidor({
  leadId,
  permisos,
}: {
  leadId: string
  permisos: Permisos
}) {
  const [leido, origenes] = await Promise.all([leerRelacionadosDelLead(leadId), getOrigenes(true)])
  return (
    <RelacionadosDelLeadCliente
      datos={leido.ok ? leido.data : null}
      para={paraRelacionadosDe(permisos, origenes.ok ? origenes.data : [])}
    />
  )
}
