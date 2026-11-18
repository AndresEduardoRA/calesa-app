import 'server-only'
import { rutaDeActividadDe } from '@/modules/actividad'
import { origenesParaCotizar, rutaDeLaHoja } from '@/modules/cotizaciones'
import { MARCADOR_DE_LEAD, type RutasDelMenuDeLead } from '@/modules/leads'
import { getOrigenes } from '@/modules/origenes'
import { datosO } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'

// «Cotizar lead» del «⋯»: la hoja de cotizar con el lead elegido, en el primer origen donde quien mira cotiza (las pestañas de la hoja
// cambian de origen y conservan el lead). Sin `cotizaciones.crear` en ningún origen no lee nada; si la lectura de los orígenes falla, la
// acción no está y la pantalla sigue. La base vuelve a exigirlo.
export async function paraCotizarDe(permisos: Permisos, leadId: string): Promise<string | null> {
  if (!puede(permisos, 'cotizaciones.crear')) {
    return null
  }
  const [primero] = origenesParaCotizar(permisos, datosO(await getOrigenes()))
  return primero ? rutaDeLaHoja({ origen: primero.id, lead: leadId }) : null
}

// «Ver actividad» del «⋯»: `/actividad` de este lead, con `actividad.ver`.
export function paraActividadDe(permisos: Permisos, leadId: string): string | null {
  return puede(permisos, 'actividad.ver') ? rutaDeActividadDe('leads', leadId) : null
}

// Las rutas del «⋯» de toda una página (la lista o el kanban), una vez por request y con `MARCADOR_DE_LEAD` en el lugar del id: cada fila
// pone el suyo (`rutaDelLead()`). Ningún pedido por fila.
export async function rutasDelMenuDeLaPagina(permisos: Permisos): Promise<RutasDelMenuDeLead> {
  return {
    paraCotizar: await paraCotizarDe(permisos, MARCADOR_DE_LEAD),
    paraActividad: paraActividadDe(permisos, MARCADOR_DE_LEAD),
  }
}
