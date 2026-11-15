import 'server-only'
import type { ConteoAcotado } from '@/shared/lib/conteo'
import { leerResolucionDeSubasta, leerSinResolver } from '../../composicion'
import type { ResolucionDeSubasta } from '../../entities/situacion'

// Quién marcó la subasta y cuándo, para el aviso de la ficha. No tumba la pantalla: si falla, el aviso se dibuja sin el nombre.
export async function resolucionDeSubasta(vehiculoId: string): Promise<ResolucionDeSubasta | null> {
  const leida = await leerResolucionDeSubasta(vehiculoId)
  if (!leida.ok) {
    console.error('la resolución de la subasta no respondió', leida.error)
    return null
  }
  return leida.data
}

// Cuántas subastas esperan resolverse en el origen, hasta `TOPE_DE_SIN_RESOLVER`, para el atajo del inventario. No tumba la pantalla: si falla, no hay atajo.
export async function sinResolverDe(origenId: string): Promise<ConteoAcotado | null> {
  const leida = await leerSinResolver(origenId)
  if (!leida.ok) {
    console.error('el conteo de las subastas sin resolver no respondió', leida.error)
    return null
  }
  return leida.data
}
