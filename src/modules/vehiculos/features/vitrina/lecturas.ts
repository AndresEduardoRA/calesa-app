import 'server-only'
import { leerVehiculo, leerVistaPrevia, leerVitrinaDelOrigen } from '../../composicion'
import type { DatosDelPanelDeVitrina } from '../../entities/paneles-de-la-lista'
import {
  VITRINA_CERRADA,
  type VistaPreviaDeVitrina,
  type VitrinaDelOrigen,
} from '../../entities/vitrina'

// Lo que el inventario necesita saber de la vitrina de un origen. Si la base no responde, el
// listado se dibuja igual: nada figura «en vitrina» y el filtro no trae filas.
export async function vitrinaDelOrigen(origenId: string): Promise<VitrinaDelOrigen> {
  const leida = await leerVitrinaDelOrigen(origenId)
  return leida.ok ? leida.data : VITRINA_CERRADA
}

// Lo que vería un visitante de este vehículo. Si no se pudo leer, la ficha se dibuja sin ella.
export async function vistaPreviaDe(vehiculoId: string): Promise<VistaPreviaDeVitrina | null> {
  const leida = await leerVistaPrevia(vehiculoId)
  return leida.ok ? leida.data : null
}

// Lo que el panel de la vitrina del inventario muestra de un vehículo (`?panel=vitrina&para=<id>`): el vehículo y, si se abre, su vista previa; sólo
// cuando la URL nombra el panel. Lo que no existe, no se ve o es de otro origen da `disponible: false`.
export async function datosDelPanelDeVitrina(
  id: string,
  origenId?: string,
): Promise<DatosDelPanelDeVitrina> {
  const leido = await leerVehiculo(id)
  const vehiculo = leido.ok ? leido.data : null
  if (!vehiculo || (origenId !== undefined && vehiculo.origenId !== origenId)) {
    return { id, disponible: false }
  }
  // La vista previa sólo de uno que se abre: un id ajeno no paga la RPC.
  return { id, disponible: true, vehiculo, previa: await vistaPreviaDe(id) }
}
