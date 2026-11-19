import type { Metadata } from 'next'
import { requerirSesion } from '@/modules/equipo'
import { redirigir } from '@/shared/lib/navegacion'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { pestanasGenerales } from './abrir'

export const metadata: Metadata = { title: 'General' }

// `/configuracion/cotizacion/general` sola abre la primera parte general que la persona puede abrir; sin ninguna, «No tienes permiso».
export default async function PaginaGeneral() {
  const sesion = await requerirSesion()
  const primera = pestanasGenerales(sesion.permisos).find((pestana) => pestana.motivo === undefined)
  if (!primera) {
    return <EstadoSinPermiso />
  }
  redirigir(primera.ruta)
}
