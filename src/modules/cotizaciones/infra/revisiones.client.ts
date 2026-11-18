// Las revisiones de una cotización desde el navegador, con la sesión de quien mira: `cotizacion_revisiones` pide ver la cotización y recorta cada diff a lo que su nivel ve.
// Una página de `TAMANO_DE_VER_MAS` por cursor (el id de la última de la anterior), sostenida por `cotizaciones_revisiones_cotizacion_idx (cotizacion_id, id desc)`.
// Si la página trae un cambio de vehículo, UNA lectura más nombra sus vehículos (T315): nunca se copia un título a la revisión.
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/browser'
import {
  conVehiculos,
  idsDeVehiculosDe,
  revisionesDesde,
  type PaginaDeRevisiones,
} from '../entities/revisiones'

// `hasta`: el instante exclusivo de «Ir a una fecha» (`hastaDeUnDia()`); sólo se manda si llega. Con `antes` también, la base toma el menor.
export type PedidoDeRevisiones = {
  cotizacionId: string
  antes: number | null
  hasta: string | null
}

type Cliente = ReturnType<typeof createClient>

// Los títulos de los vehículos que nombran los cambios de vehículo de la página, por `vehiculos_pkey` y con la RLS de quien mira (lo que no ve no vuelve), sin la papelera
// (se nombra como lo que no se ve) y con `.limit(ids.length)`: a lo sumo 2 × `TAMANO_DE_VER_MAS` ids. Nulo si la lectura falla: la revisión se dice sin nombres.
async function titulosDe(
  supabase: Cliente,
  ids: string[],
): Promise<ReadonlyMap<string, string> | null> {
  const { data, error } = await supabase
    .from('vehiculos')
    .select('id, titulo')
    .in('id', ids)
    .is('eliminado_en', null)
    .limit(ids.length)
  if (error) {
    return null
  }
  return new Map(data.map((fila) => [fila.id.toLowerCase(), fila.titulo]))
}

export async function leerRevisiones({
  cotizacionId,
  antes,
  hasta,
}: PedidoDeRevisiones): Promise<Resultado<PaginaDeRevisiones>> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('cotizacion_revisiones', {
    p_cotizacion: cotizacionId,
    p_tamano: TAMANO_DE_VER_MAS,
    ...(antes === null ? {} : { p_antes: antes }),
    ...(hasta === null ? {} : { p_hasta: hasta }),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const pagina = revisionesDesde(data)
  if (pagina === null) {
    return fallo('inesperado', 'No se pudieron cargar las revisiones.')
  }
  const ids = idsDeVehiculosDe(pagina.revisiones)
  return ok(ids.length === 0 ? pagina : conVehiculos(pagina, await titulosDe(supabase, ids)))
}
