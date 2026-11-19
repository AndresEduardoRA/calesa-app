import 'server-only'
import { leerGaleria, leerSubasta, leerVehiculo } from '../../composicion'
import type { DatosDelPanelDeImagenes } from '../../entities/paneles-de-la-lista'
import { fotosPorTraerDe } from '../../entities/subasta-vehiculo'
import { editablesDe } from '../permisos/editables'
import type { Permisos } from '@/shared/lib/permisos'

type Opciones = {
  // El origen de la pantalla (el inventario): uno de otro origen no se abre.
  origenId?: string
  // Un origen de subasta con apibara encendida: ofrece traer las fotos que faltan.
  conSubasta: boolean
}

// Lo que el drawer «Editar imágenes» muestra de un vehículo: lo mismo que el bloque «Fotos» de la ficha (`bloque-fotos.tsx`), más si quien mira lo
// edita. Se lee sólo cuando la URL nombra el panel. Lo que no existe, no se ve o es de otro origen da `disponible: false`.
export async function datosDelPanelDeImagenes(
  quien: { permisos: Permisos; usuarioId: string },
  id: string,
  { origenId, conSubasta }: Opciones,
): Promise<DatosDelPanelDeImagenes> {
  const leido = await leerVehiculo(id)
  const vehiculo = leido.ok ? leido.data : null
  if (!vehiculo || (origenId !== undefined && vehiculo.origenId !== origenId)) {
    return { id, disponible: false }
  }
  const [galeria, subasta, editables] = await Promise.all([
    leerGaleria(id),
    conSubasta ? leerSubasta(id) : null,
    editablesDe(quien, [vehiculo]),
  ])
  if (!galeria.ok) {
    return { id, disponible: false }
  }
  const puedeEditar = editables.has(id)
  const fotas = puedeEditar && subasta?.ok ? fotosPorTraerDe(subasta.data) : []
  return {
    id,
    disponible: true,
    titulo: vehiculo.titulo,
    galeria: galeria.data,
    puedeEditar,
    ...(fotas.length > 0 ? { deSubasta: { origenId: vehiculo.origenId, fotas } } : {}),
  }
}
