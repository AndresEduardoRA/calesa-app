import type { Metadata } from 'next'
import { puede, requerirSesion } from '@/modules/equipo'
import { redirigir } from '@/shared/lib/navegacion'
import { EstadoSinPermiso, EstadoVacio } from '@/shared/ui/estados'
import { EncabezadoDeConfiguracion } from '../_navegacion/encabezado-de-configuracion'
import { conSubseccionesVisibles } from '../secciones'
import { SECCION_DE_LOGISTICA } from './seccion'
import { destinoDeLaUrlVieja } from './url-vieja'

export const metadata: Metadata = { title: SECCION_DE_LOGISTICA.titulo }

// Configuración › Logística, sin más: no tiene página propia, abre el primer catálogo que la persona puede abrir (`/puertos`, `/navieras`,
// `/categorias-de-gasto`). Las URLs de cuando eran pestañas (`?seccion=`) van a la de su catálogo con sus `?panel=` (`url-vieja.ts`). Entra
// quien tiene `logistica.catalogos.gestionar`; sin la clave, «No tienes permiso». Mientras ningún área llene un catálogo dice que no hay
// nada que configurar.
export default async function PaginaDeConfiguracionDeLogistica({
  searchParams,
}: PageProps<'/configuracion/logistica'>) {
  const [{ permisos }, parametros] = await Promise.all([requerirSesion(), searchParams])
  if (!puede(permisos, 'logistica.catalogos.gestionar')) {
    return <EstadoSinPermiso />
  }
  const abiertos = conSubseccionesVisibles(SECCION_DE_LOGISTICA, permisos).subsecciones
  const destino = destinoDeLaUrlVieja(parametros, abiertos)
  if (destino !== null) {
    redirigir(destino)
  }
  return (
    <div className="grid max-w-3xl gap-4">
      <EncabezadoDeConfiguracion
        titulo={SECCION_DE_LOGISTICA.titulo}
        descripcion={SECCION_DE_LOGISTICA.descripcion}
      />
      <EstadoVacio compacto titulo="Por ahora no hay nada que configurar aquí." />
    </div>
  )
}
