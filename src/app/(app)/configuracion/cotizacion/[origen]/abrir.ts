import 'server-only'
import { z } from 'zod'
import { requerirSesion } from '@/modules/equipo'
import { getOrigenes } from '@/modules/origenes'
import { datosO } from '@/shared/lib/errores'
import { redirigir } from '@/shared/lib/navegacion'
import { rutaDeConfiguracionDeCotizacion, type PestanaDeCotizacion } from '@/shared/lib/rutas'
import { accesoDeCotizacion, primeraDeCotizacion } from '../acceso'
import { PARTES_DEL_ORIGEN } from '../seccion'
import type { OrigenDelSelector } from '../selector-de-origen'

export type OrigenDeCotizacion = { id: string; nombre: string; activo: boolean }

type OrigenAbierto =
  | { sinPermiso: true }
  | {
      sinPermiso: false
      origen: OrigenDeCotizacion
      // Los chips del selector: cada origen que configura, con la misma pestaña.
      origenes: OrigenDelSelector[]
      // Las pestañas del origen, con su ruta resuelta.
      pestanas: { clave: PestanaDeCotizacion; titulo: string; ruta: string }[]
    }

// Lo que cada pestaña de un origen comprueba antes de dibujarse: cada página lo hace sola (un layout no protege a su página). Un `<origen>` que
// no es un uuid, que no existe o donde la persona no tiene `cotizaciones.configurar` abre la misma pestaña del primero que configura (sin
// error); sin ninguno, la primera parte general que abre; sin nada, «No tienes permiso». `getOrigenes(true)` lee la tabla una vez por
// request. La base vuelve a exigir la clave en cada lectura y RPC.
export async function abrirOrigenDeCotizacion(
  id: string,
  pestana: PestanaDeCotizacion,
): Promise<OrigenAbierto> {
  const sesion = await requerirSesion()
  const catalogo = datosO(await getOrigenes(true))
  const acceso = accesoDeCotizacion(sesion.permisos, catalogo)
  const suyos = catalogo.filter((origen) => acceso.origenes.includes(origen.id))
  const origen = z.guid().safeParse(id).success ? suyos.find((uno) => uno.id === id) : undefined
  if (!origen) {
    const destino = primeraDeCotizacion(acceso, pestana)
    if (destino === null) {
      return { sinPermiso: true }
    }
    redirigir(destino)
  }
  return {
    sinPermiso: false,
    origen: { id: origen.id, nombre: origen.nombre, activo: origen.activo },
    origenes: suyos.map((uno) => ({
      id: uno.id,
      nombre: uno.nombre,
      color: uno.color,
      activo: uno.activo,
      href: rutaDeConfiguracionDeCotizacion(uno.id, pestana),
    })),
    pestanas: PARTES_DEL_ORIGEN.map((parte) => ({
      clave: parte.clave,
      titulo: parte.titulo,
      ruta: rutaDeConfiguracionDeCotizacion(origen.id, parte.clave),
    })),
  }
}
