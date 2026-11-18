import 'server-only'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { puede, requerirSesion } from '@/modules/equipo'
import { leerOrigenes, type OrigenConUso } from '@/modules/origenes'
import { datosO } from '@/shared/lib/errores'
import { puedeAbrirOrigenes } from '../acceso'

type OrigenAbierto =
  | { sinPermiso: true }
  | {
      sinPermiso: false
      sesion: Awaited<ReturnType<typeof requerirSesion>>
      origen: OrigenConUso
      puedeGestionar: boolean
    }

// Lo que cada parte de un origen (`datos`, `campos`, `categorias`) comprueba antes de dibujarse: cada página lo hace sola (un layout no
// protege a su página). Sin ningún permiso de orígenes, «No tienes permiso»; un id que no es un uuid o un origen que no existe, el 404.
// `leerOrigenes()` lee una vez por request.
export async function abrirOrigen(id: string): Promise<OrigenAbierto> {
  const sesion = await requerirSesion()
  if (!puedeAbrirOrigenes(sesion.permisos)) {
    return { sinPermiso: true }
  }
  if (!z.guid().safeParse(id).success) {
    notFound()
  }
  const origen = datosO(await leerOrigenes()).find((otro) => otro.id === id)
  if (!origen) {
    notFound()
  }
  return {
    sinPermiso: false,
    sesion,
    origen,
    puedeGestionar: puede(sesion.permisos, 'origenes.gestionar'),
  }
}
