import type { Metadata } from 'next'
import { puede, requerirSesion } from '@/modules/equipo'
import { redirigir } from '@/shared/lib/navegacion'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { SECCION_DE_REPUESTOS } from './seccion'
import { destinoDeLaUrlVieja } from './url-vieja'

export const metadata: Metadata = { title: SECCION_DE_REPUESTOS.titulo }

// Configuración › Repuestos, sin más: no tiene página propia, abre el flujo de repuestos (`/flujo`). Las URLs de cuando eran pestañas (`?seccion=`)
// van a su sub-ruta con sus `?panel=` (`url-vieja.ts`). Entra quien tiene `repuestos.configurar`; sin la clave, «No tienes permiso». La base vuelve
// a exigir la clave en cada escritura.
export default async function PaginaDeConfiguracionDeRepuestos({
  searchParams,
}: PageProps<'/configuracion/repuestos'>) {
  const [{ permisos }, parametros] = await Promise.all([requerirSesion(), searchParams])
  if (!puede(permisos, 'repuestos.configurar')) {
    return <EstadoSinPermiso />
  }
  redirigir(destinoDeLaUrlVieja(parametros))
}
