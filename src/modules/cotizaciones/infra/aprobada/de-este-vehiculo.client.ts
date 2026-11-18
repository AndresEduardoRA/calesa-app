// «De este vehículo» desde el navegador, con la sesión de quien mira: `cotizaciones_de_este_vehiculo()` es invocadora y la RLS decide qué llega. Va por el
// navegador porque el bloque se lee al acercarse (la guardada) o al abrir el resumen, y cada «Ver más» pide su página sin ir al servidor. Una página de
// `TAMANO_DE_ESTE_VEHICULO` y una de más para saber si hay otra (`cotizaciones_vehiculo_creado_idx`); la primera trae además la aprobada (`fijada`).
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { armarPaginaPor, TAMANO_DE_ESTE_VEHICULO, type Cursor } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/browser'
import {
  paginaDeEsteVehiculoDesde,
  type PaginaLeidaDeEsteVehiculo,
} from '../../entities/aprobada/de-este-vehiculo'

export type PedidoDeEsteVehiculo = { vehiculoId: string; cursor: Cursor | null }

const NO_PUDIMOS = 'No pudimos cargar las cotizaciones de este vehículo.'

export async function leerDeEsteVehiculo({
  vehiculoId,
  cursor,
}: PedidoDeEsteVehiculo): Promise<Resultado<PaginaLeidaDeEsteVehiculo>> {
  const { data, error } = await createClient().rpc('cotizaciones_de_este_vehiculo', {
    p_vehiculo: vehiculoId,
    p_tamano: TAMANO_DE_ESTE_VEHICULO,
    ...(cursor === null ? {} : { p_cursor_en: cursor.instante, p_cursor_id: cursor.id }),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const pagina = paginaDeEsteVehiculoDesde(data)
  if (pagina === null) {
    return fallo('inesperado', NO_PUDIMOS)
  }
  // El cursor sale de la última fila de la página, nunca de la fijada.
  const { filas, siguiente } = armarPaginaPor(
    pagina.filas,
    TAMANO_DE_ESTE_VEHICULO,
    cursor,
    (fila) => fila.creadoEn,
  )
  return ok({ fijada: pagina.fijada, filas, siguiente })
}
