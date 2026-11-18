import type { Metadata } from 'next'
import { requerirSesion } from '@/modules/equipo'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EncabezadoDeConfiguracion } from '../../_navegacion/encabezado-de-configuracion'
import { entrarASubseccion } from '../entrar'
import { AJUSTES_DEL_SITIO } from '../seccion'
import { SeccionAjustes } from './seccion'

export const metadata: Metadata = { title: AJUSTES_DEL_SITIO.titulo }

// Configuración › Sitio web › Ajustes (`web.ajustes.gestionar`): la fila única del sitio, con la barra de cambios sin guardar.
export default async function PaginaDeAjustesDelSitio() {
  const { permisos } = await requerirSesion()
  if (entrarASubseccion(permisos, AJUSTES_DEL_SITIO) === 'sin-permiso') {
    return <EstadoSinPermiso />
  }
  return (
    <div className="grid max-w-3xl gap-4">
      <EncabezadoDeConfiguracion {...AJUSTES_DEL_SITIO} />
      <SeccionAjustes />
    </div>
  )
}
