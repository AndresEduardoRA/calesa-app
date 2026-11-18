import type { Metadata } from 'next'
import { requerirSesion } from '@/modules/equipo'
import { redirigir } from '@/shared/lib/navegacion'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { primeraSubseccionAbierta } from '../secciones'
import { SECCION_DE_WEB } from './seccion'
import { destinoDeLaUrlVieja } from './url-vieja'

export const metadata: Metadata = { title: SECCION_DE_WEB.titulo }

// Configuración › Sitio web no dibuja nada: abre la primera sub-sección que la persona puede (Ajustes con `web.ajustes.gestionar`; si no, Guías).
// Las URLs de cuando Sitio web tenía pestañas (`?seccion=`) van primero a su sub-ruta (`url-vieja.ts`), con lo demás de la URL. Sin ningún permiso
// de la sección, «No tienes permiso».
export default async function PaginaDeConfiguracionDeWeb({
  searchParams,
}: PageProps<'/configuracion/web'>) {
  const destino = destinoDeLaUrlVieja(await searchParams)
  if (destino !== null) {
    redirigir(destino)
  }
  const { permisos } = await requerirSesion()
  const primera = primeraSubseccionAbierta(SECCION_DE_WEB, permisos)
  if (primera === null) {
    return <EstadoSinPermiso />
  }
  redirigir(primera)
}
